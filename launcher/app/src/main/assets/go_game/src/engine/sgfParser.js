const ABC = 'abcdefghijklmnopqrstuvwxyz';

export function xyToSgf([x, y]) {
  if (x < 0 || y < 0 || x >= ABC.length || y >= ABC.length) return '';
  return `${ABC[x]}${ABC[y]}`;
}

export function sgfToXy(token, size) {
  if (!token || token.length < 2) return null;
  const x = ABC.indexOf(token[0].toLowerCase());
  const y = ABC.indexOf(token[1].toLowerCase());
  if (x < 0 || y < 0 || x >= size || y >= size) return null;
  return [x, y];
}

function expandPointValues(values, size) {
  const coords = [];
  for (const raw of values) {
    const token = raw.trim();
    if (!token) continue;
    if (token.includes(':')) {
      const [p1, p2] = token.split(':');
      const c1 = sgfToXy(p1, size);
      const c2 = sgfToXy(p2, size);
      if (c1 && c2) {
        const minX = Math.min(c1[0], c2[0]);
        const maxX = Math.max(c1[0], c2[0]);
        const minY = Math.min(c1[1], c2[1]);
        const maxY = Math.max(c1[1], c2[1]);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            coords.push([x, y]);
          }
        }
      }
    } else {
      const pt = sgfToXy(token, size);
      if (pt) coords.push(pt);
    }
  }
  return coords;
}

export function parseSgfCollection(sgfText) {
  if (!sgfText || typeof sgfText !== 'string') {
    throw new Error('SGF 内容为空');
  }

  let i = 0;
  const len = sgfText.length;

  function skipWs() {
    while (i < len && /\s/.test(sgfText[i])) i++;
  }

  function parsePropIdent() {
    skipWs();
    let ident = '';
    while (i < len && /[A-Za-z]/.test(sgfText[i])) {
      ident += sgfText[i].toUpperCase();
      i++;
    }
    return ident;
  }

  function parsePropValue() {
    skipWs();
    if (sgfText[i] !== '[') return null;
    i++; // skip '['
    let val = '';
    while (i < len) {
      const ch = sgfText[i];
      if (ch === '\\') {
        i++;
        if (i < len) {
          val += sgfText[i];
          i++;
        }
      } else if (ch === ']') {
        i++; // skip ']'
        return val;
      } else {
        val += ch;
        i++;
      }
    }
    throw new Error('SGF 格式错误：缺少闭合方括号 "]"');
  }

  function parseNode() {
    skipWs();
    if (sgfText[i] !== ';') {
      throw new Error(`SGF 格式错误：期望 ";"（位置 ${i}）`);
    }
    i++; // skip ';'
    const props = {};
    while (i < len) {
      skipWs();
      if (sgfText[i] === ';' || sgfText[i] === '(' || sgfText[i] === ')') break;
      const ident = parsePropIdent();
      if (!ident) {
        i++;
        continue;
      }
      const vals = [];
      while (i < len) {
        skipWs();
        if (sgfText[i] !== '[') break;
        const v = parsePropValue();
        if (v !== null) vals.push(v);
      }
      if (vals.length > 0) {
        props[ident] = (props[ident] || []).concat(vals);
      }
    }
    return { props, children: [] };
  }

  function parseGameTree() {
    skipWs();
    if (sgfText[i] !== '(') {
      throw new Error(`SGF 格式错误：期望 "("（位置 ${i}）`);
    }
    i++; // skip '('
    let firstNode = null;
    let lastNode = null;

    while (i < len) {
      skipWs();
      if (sgfText[i] === ';') {
        const node = parseNode();
        if (!firstNode) firstNode = node;
        if (lastNode) lastNode.children.push(node);
        lastNode = node;
      } else if (sgfText[i] === '(') {
        const subRoot = parseGameTree();
        if (lastNode && subRoot) {
          lastNode.children.push(subRoot);
        } else if (!firstNode && subRoot) {
          firstNode = subRoot;
          lastNode = subRoot;
        }
      } else if (sgfText[i] === ')') {
        i++; // skip ')'
        break;
      } else {
        i++;
      }
    }
    return firstNode;
  }

  const roots = [];
  while (i < len) {
    skipWs();
    if (i >= len) break;
    if (sgfText[i] === '(') {
      const root = parseGameTree();
      if (root) roots.push(root);
    } else {
      i++;
    }
  }

  if (roots.length === 0) {
    throw new Error('未识别到有效的 SGF 棋谱树 "(;...)"');
  }
  return roots;
}

const POSITIVE_RE = /\b(right|correct|good|ok)\b|正解|正确|成功|妙手|✓|✔/i;
const NEGATIVE_RE = /\b(wrong|fail|incorrect|bad|error)\b|失败|错误|不对|错招|×|✗/i;

function detectCommentSignal(text, props, flipColors) {
  const txt = `${(props.N && props.N[0]) || ''} ${text || ''}`;
  if (NEGATIVE_RE.test(txt) || props.BM || props.WV) return 'wrong';
  if (!flipColors && props.GW) return 'wrong';
  if (flipColors && props.GB) return 'wrong';

  if (POSITIVE_RE.test(txt) || props.TE) return 'right';
  if (!flipColors && props.GB) return 'right';
  if (flipColors && props.GW) return 'right';

  return null;
}

function buildNormalizedTree(sgfNode, size, flipColors) {
  const hasBlack = Boolean(sgfNode.props.B && sgfNode.props.B[0]);
  const hasWhite = Boolean(sgfNode.props.W && sgfNode.props.W[0]);
  let color = null;
  let move = null;

  if (hasBlack) {
    color = flipColors ? 'white' : 'black';
    move = sgfToXy(sgfNode.props.B[0], size);
  } else if (hasWhite) {
    color = flipColors ? 'black' : 'white';
    move = sgfToXy(sgfNode.props.W[0], size);
  }

  const comment = ((sgfNode.props.C && sgfNode.props.C[0]) || '').trim();
  const signal = detectCommentSignal(comment, sgfNode.props, flipColors);

  const children = [];
  for (const ch of sgfNode.children || []) {
    const norm = buildNormalizedTree(ch, size, flipColors);
    if (norm.move) {
      children.push(norm);
    } else if (norm.children.length > 0) {
      children.push(...norm.children);
    }
  }

  return {
    color,
    move,
    comment,
    signal,
    isCorrect: null,
    children,
  };
}

function annotateCorrectness(node) {
  if (!node.children || node.children.length === 0) {
    if (node.signal === 'wrong') node.isCorrect = false;
    else if (node.signal === 'right') node.isCorrect = true;
    else node.isCorrect = null;
    return node.isCorrect;
  }

  const childStates = node.children.map((ch) => annotateCorrectness(ch));
  if (node.signal === 'wrong') {
    node.isCorrect = false;
  } else if (node.signal === 'right') {
    node.isCorrect = true;
  } else if (childStates.some((s) => s === true)) {
    node.isCorrect = true;
  } else if (childStates.every((s) => s === false)) {
    node.isCorrect = false;
  } else {
    node.isCorrect = null;
  }
  return node.isCorrect;
}

function finalizeTreeLabels(root) {
  annotateCorrectness(root);
  const hasExplicitRight = (function checkRight(n) {
    if (n.isCorrect === true && n.move) return true;
    return (n.children || []).some(checkRight);
  })(root);

  if (!hasExplicitRight && root.children.length > 0) {
    let cur = root.children[0];
    while (cur) {
      if (cur.signal !== 'wrong') cur.isCorrect = true;
      cur = cur.children[0];
    }
  }

  (function fillRest(n) {
    if (n.isCorrect === null) {
      n.isCorrect = n.children.some((c) => c.isCorrect === true);
    }
    for (const c of n.children || []) fillRest(c);
  })(root);

  root.isCorrect = true;
}

export function computeViewport(size, initialStones, sgfTree) {
  if (size <= 7) {
    return { x0: 0, y0: 0, x1: size - 1, y1: size - 1 };
  }

  const pts = [
    ...(initialStones.black || []),
    ...(initialStones.white || []),
  ];
  (function walk(n) {
    if (n.move) pts.push(n.move);
    for (const c of n.children || []) walk(c);
  })(sgfTree);

  if (pts.length === 0) {
    return { x0: 0, y0: 0, x1: Math.min(size - 1, 6), y1: Math.min(size - 1, 6) };
  }

  let minX = size - 1;
  let maxX = 0;
  let minY = size - 1;
  let maxY = 0;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  let x0 = minX <= 2 ? 0 : Math.max(0, minX - 2);
  let x1 = maxX >= size - 3 ? size - 1 : Math.min(size - 1, maxX + 2);
  let y0 = minY <= 2 ? 0 : Math.max(0, minY - 2);
  let y1 = maxY >= size - 3 ? size - 1 : Math.min(size - 1, maxY + 2);

  const span = Math.min(size - 1, Math.max(6, x1 - x0, y1 - y0));

  if (x1 - x0 < span) {
    if (x0 === 0) x1 = span;
    else if (x1 === size - 1) x0 = size - 1 - span;
    else {
      const need = span - (x1 - x0);
      x0 = Math.max(0, x0 - Math.floor(need / 2));
      x1 = Math.min(size - 1, x0 + span);
      if (x1 - x0 < span) x0 = Math.max(0, x1 - span);
    }
  }
  if (y1 - y0 < span) {
    if (y0 === 0) y1 = span;
    else if (y1 === size - 1) y0 = size - 1 - span;
    else {
      const need = span - (y1 - y0);
      y0 = Math.max(0, y0 - Math.floor(need / 2));
      y1 = Math.min(size - 1, y0 + span);
      if (y1 - y0 < span) y0 = Math.max(0, y1 - span);
    }
  }

  return { x0, y0, x1, y1 };
}

export function sgfTreeToLevel(rootNode, meta = {}) {
  const rawSz = Number((rootNode.props.SZ && rootNode.props.SZ[0]) || 19);
  const boardSize = Number.isFinite(rawSz) && rawSz >= 5 && rawSz <= 19 ? rawSz : 19;

  const firstChild = rootNode.children && rootNode.children[0];
  const explicitTurn = rootNode.props.PL && rootNode.props.PL[0] ? rootNode.props.PL[0].toUpperCase() : '';
  const inferredTurn = firstChild && firstChild.props && firstChild.props.W ? 'W' : 'B';
  const flipColors = explicitTurn ? explicitTurn === 'W' : inferredTurn === 'W';

  const rawBlack = expandPointValues(rootNode.props.AB || [], boardSize);
  const rawWhite = expandPointValues(rootNode.props.AW || [], boardSize);

  const initialStones = {
    black: flipColors ? rawWhite : rawBlack,
    white: flipColors ? rawBlack : rawWhite,
  };

  // 若根节点本身带有 B/W（少见），提升为子节点
  const sgfTree = buildNormalizedTree(rootNode, boardSize, flipColors);
  if (sgfTree.move && sgfTree.color) {
    const promoted = { ...sgfTree };
    sgfTree.color = null;
    sgfTree.move = null;
    sgfTree.comment = '';
    sgfTree.children = [promoted];
  }

  finalizeTreeLabels(sgfTree);

  const viewport = computeViewport(boardSize, initialStones, sgfTree);
  const rawTitle = (rootNode.props.GN && rootNode.props.GN[0]) || (rootNode.props.N && rootNode.props.N[0]) || meta.title || 'SGF 围棋谜题';
  const rootComment = ((rootNode.props.C && rootNode.props.C[0]) || '').trim();
  const coachPrompt =
    meta.coachPrompt ||
    (rootComment ? rootComment.slice(0, 32) : `${rawTitle}：请找出黑棋妙手！`);

  return {
    id: meta.id || `sgf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    unitId: meta.unitId !== undefined && meta.unitId !== null ? meta.unitId : 3,
    nodeId: meta.nodeId !== undefined && meta.nodeId !== null ? meta.nodeId : 'custom',
    boardSize,
    type: 'sgf_tree',
    enableD4Transform: false,
    scaffoldMode: meta.scaffoldMode !== undefined && meta.scaffoldMode !== null ? meta.scaffoldMode : 'tap_inspect',
    target: meta.target !== undefined && meta.target !== null ? meta.target : 'capture',
    title: rawTitle,
    coachPrompt,
    initialStones,
    sgfTree,
    viewport,
  };
}

export function parseSgfLevels(sgfText, baseMeta = {}) {
  const roots = parseSgfCollection(sgfText);
  return roots.map((root, idx) =>
    sgfTreeToLevel(root, {
      ...baseMeta,
      id: baseMeta.idPrefix ? `${baseMeta.idPrefix}-${String(idx + 1).padStart(2, '0')}` : undefined,
      title: baseMeta.titlePrefix ? `${baseMeta.titlePrefix} #${idx + 1}` : undefined,
    })
  );
}

export function exportLevelToSgf(level) {
  const sz = level.boardSize || 7;
  const ab = ((level.initialStones && level.initialStones.black) || []).map((c) => `[${xyToSgf(c)}]`).join('');
  const aw = ((level.initialStones && level.initialStones.white) || []).map((c) => `[${xyToSgf(c)}]`).join('');
  const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\]/g, '\\]');

  function serTree(node) {
    const tag = node.color === 'white' ? 'W' : 'B';
    const mv = node.move ? `${tag}[${xyToSgf(node.move)}]` : '';
    const hasKids = node.children && node.children.length > 0;
    const cmt = node.comment ? `C[${esc(node.comment)}]` : node.isCorrect === true && !hasKids ? 'C[正解]' : '';
    const head = mv || cmt ? `;${mv}${cmt}` : '';
    if (!hasKids) return head;
    if (node.children.length === 1) return `${head}${serTree(node.children[0])}`;
    return `${head}${node.children.map((ch) => `(${serTree(ch)})`).join('')}`;
  }

  let body = '';
  if (level.type === 'sgf_tree' && level.sgfTree) {
    const childrenStr =
      level.sgfTree.children.length === 1
        ? serTree(level.sgfTree.children[0])
        : level.sgfTree.children.map((c) => `(${serTree(c)})`).join('');
    body = childrenStr;
  } else if (level.type === 'single_move' && level.validMoves && level.validMoves[0]) {
    body = `;B[${xyToSgf(level.validMoves[0])}]C[正解]`;
  } else if (level.type === 'multi_step' && level.steps && level.steps.length) {
    body = level.steps
      .map((st, idx) => {
        const b = `;B[${xyToSgf(st.expectedMoves[0])}]${idx === level.steps.length - 1 ? 'C[正解]' : ''}`;
        const w = st.aiReply ? `;W[${xyToSgf(st.aiReply)}]` : '';
        return b + w;
      })
      .join('');
  }

  return `(;GM[1]FF[4]SZ[${sz}]${level.coachPrompt ? `C[${esc(level.coachPrompt)}]` : ''}${ab ? `AB${ab}` : ''}${aw ? `AW${aw}` : ''}${body})`;
}
