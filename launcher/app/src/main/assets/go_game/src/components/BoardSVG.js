import { analyzeBoard, coordKey } from '../engine/goEngine.js';

const THEME_PALETTE = {
  bamboo: { line: '#4E7D2B', star: '#375E1A' },
  wood: { line: '#6D4118', star: '#4F2C0D' },
  starry: { line: '#8FA7FF', star: '#FFD54F' },
};

function getStarPoints(size) {
  if (size === 5) return [[2, 2]];
  if (size === 7) {
    return [
      [2, 2],
      [4, 2],
      [3, 3],
      [2, 4],
      [4, 4],
    ];
  }
  if (size === 9) {
    return [
      [2, 2],
      [6, 2],
      [4, 4],
      [2, 6],
      [6, 6],
    ];
  }
  if (size === 13) {
    return [
      [3, 3],
      [9, 3],
      [6, 6],
      [3, 9],
      [9, 9],
    ];
  }
  if (size === 19) {
    const pts = [];
    for (const y of [3, 9, 15]) {
      for (const x of [3, 9, 15]) pts.push([x, y]);
    }
    return pts;
  }
  return [];
}

function renderStoneFace(cx, cy, r, color, status, skin) {
  if (skin === 'yunzi') {
    const highlight = color === 'black' ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.85)';
    return `
      <ellipse cx="${cx - r * 0.28}" cy="${cy - r * 0.28}" rx="${r * 0.26}" ry="${r * 0.16}"
        transform="rotate(-30 ${cx - r * 0.28} ${cy - r * 0.28})" fill="${highlight}" />
      ${
        status === 'ATARI'
          ? `<circle cx="${cx}" cy="${cy}" r="${r * 1.13}" fill="none" stroke="#FF4B4B" stroke-width="2.4" stroke-dasharray="4 3"/>`
          : ''
      }
    `;
  }

  const eyeFill = color === 'black' ? (skin === 'alien' ? '#7DF9FF' : '#FFFFFF') : (skin === 'alien' ? '#7C3AED' : '#2B2D42');
  const mouthStroke = color === 'black' ? '#FFFFFF' : '#2B2D42';

  let alienAntennas = '';
  if (skin === 'alien') {
    const antColor = color === 'black' ? '#7DF9FF' : '#A855F7';
    alienAntennas = `
      <line x1="${cx - r * 0.35}" y1="${cy - r * 0.82}" x2="${cx - r * 0.52}" y2="${cy - r * 1.15}" stroke="${antColor}" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="${cx - r * 0.52}" cy="${cy - r * 1.15}" r="${r * 0.13}" fill="${antColor}"/>
      <line x1="${cx + r * 0.35}" y1="${cy - r * 0.82}" x2="${cx + r * 0.52}" y2="${cy - r * 1.15}" stroke="${antColor}" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="${cx + r * 0.52}" cy="${cy - r * 1.15}" r="${r * 0.13}" fill="${antColor}"/>
    `;
  }

  if (status === 'ATARI') {
    return `
      ${alienAntennas}
      <path d="M${cx - r * 0.42} ${cy - r * 0.22} L${cx - r * 0.18} ${cy - r * 0.08} L${cx - r * 0.42} ${cy + r * 0.06}"
        fill="none" stroke="${eyeFill}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M${cx + r * 0.42} ${cy - r * 0.22} L${cx + r * 0.18} ${cy - r * 0.08} L${cx + r * 0.42} ${cy + r * 0.06}"
        fill="none" stroke="${eyeFill}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M${cx - r * 0.26} ${cy + r * 0.32} Q${cx - r * 0.12} ${cy + r * 0.18} ${cx} ${cy + r * 0.32} Q${cx + r * 0.12} ${cy + r * 0.44} ${cx + r * 0.26} ${cy + r * 0.32}"
        fill="none" stroke="${mouthStroke}" stroke-width="1.9" stroke-linecap="round"/>
      <path d="M${cx + r * 0.65} ${cy - r * 0.62} Q${cx + r * 0.82} ${cy - r * 0.32} ${cx + r * 0.65} ${cy - r * 0.16} Q${cx + r * 0.48} ${cy - r * 0.32} ${cx + r * 0.65} ${cy - r * 0.62} Z"
        fill="#38BDF8"/>
    `;
  }

  if (status === 'CAUTION') {
    return `
      ${alienAntennas}
      <circle cx="${cx - r * 0.28}" cy="${cy - r * 0.1}" r="${r * 0.13}" fill="${eyeFill}"/>
      <circle cx="${cx + r * 0.28}" cy="${cy - r * 0.1}" r="${r * 0.13}" fill="${eyeFill}"/>
      <line x1="${cx - r * 0.42}" y1="${cy - r * 0.34}" x2="${cx - r * 0.14}" y2="${cy - r * 0.26}" stroke="${mouthStroke}" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="${cx + r * 0.42}" y1="${cy - r * 0.34}" x2="${cx + r * 0.14}" y2="${cy - r * 0.26}" stroke="${mouthStroke}" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="${cx - r * 0.18}" y1="${cy + r * 0.28}" x2="${cx + r * 0.18}" y2="${cy + r * 0.28}" stroke="${mouthStroke}" stroke-width="2" stroke-linecap="round"/>
    `;
  }

  // SAFE
  return `
    ${alienAntennas}
    <circle cx="${cx - r * 0.28}" cy="${cy - r * 0.1}" r="${r * 0.14}" fill="${eyeFill}"/>
    <circle cx="${cx + r * 0.28}" cy="${cy - r * 0.1}" r="${r * 0.14}" fill="${eyeFill}"/>
    <path d="M${cx - r * 0.22} ${cy + r * 0.22} Q${cx} ${cy + r * 0.42} ${cx + r * 0.22} ${cy + r * 0.22}"
      fill="none" stroke="${mouthStroke}" stroke-width="2" stroke-linecap="round"/>
  `;
}

export function renderBoardSVG({
  board,
  viewport = null,
  theme = 'bamboo',
  skin = 'dango',
  scaffoldMode = 'atari_only',
  levelType = 'single_move',
  foundKeys = new Set(),
  targetLibertyKeys = new Set(),
  inspectedGroupId = null,
  hintCoord = null,
  forbiddenCoord = null,
  lastMove = null,
  captureBursts = [],
  cursorCoord = null,
}) {
  const size = board.length;
  const vp = viewport || { x0: 0, y0: 0, x1: size - 1, y1: size - 1 };
  const viewSpan = Math.max(1, vp.x1 - vp.x0, vp.y1 - vp.y0);
  const pad = viewSpan <= 4 ? 52 : 38;
  const cell = (400 - pad * 2) / viewSpan;
  const r = cell * 0.41;
  const px = (x) => pad + (x - vp.x0) * cell;
  const py = (y) => pad + (y - vp.y0) * cell;
  const inVp = (x, y) => x >= vp.x0 && x <= vp.x1 && y >= vp.y0 && y <= vp.y1;

  const palette = THEME_PALETTE[theme] || THEME_PALETTE.bamboo;
  const analysis = analyzeBoard(board);

  // Grid lines (with thick real borders and dashed continuation tails for cropped viewports)
  let gridLines = '';
  const tail = cell * 0.34;
  const leftX = px(vp.x0);
  const rightX = px(vp.x1);
  const topY = py(vp.y0);
  const botY = py(vp.y1);

  for (let y = vp.y0; y <= vp.y1; y++) {
    const posY = py(y);
    const isBorder = y === 0 || y === size - 1;
    gridLines += `<line x1="${leftX}" y1="${posY}" x2="${rightX}" y2="${posY}" stroke="${palette.line}" stroke-width="${isBorder ? 3.2 : 2.1}" stroke-linecap="round" opacity="${isBorder ? 0.92 : 0.72}"/>`;
    if (vp.x0 > 0) {
      gridLines += `<line x1="${leftX - tail}" y1="${posY}" x2="${leftX}" y2="${posY}" stroke="${palette.line}" stroke-width="1.8" stroke-dasharray="3 3" opacity="0.52"/>`;
    }
    if (vp.x1 < size - 1) {
      gridLines += `<line x1="${rightX}" y1="${posY}" x2="${rightX + tail}" y2="${posY}" stroke="${palette.line}" stroke-width="1.8" stroke-dasharray="3 3" opacity="0.52"/>`;
    }
  }
  for (let x = vp.x0; x <= vp.x1; x++) {
    const posX = px(x);
    const isBorder = x === 0 || x === size - 1;
    gridLines += `<line x1="${posX}" y1="${topY}" x2="${posX}" y2="${botY}" stroke="${palette.line}" stroke-width="${isBorder ? 3.2 : 2.1}" stroke-linecap="round" opacity="${isBorder ? 0.92 : 0.72}"/>`;
    if (vp.y0 > 0) {
      gridLines += `<line x1="${posX}" y1="${topY - tail}" x2="${posX}" y2="${topY}" stroke="${palette.line}" stroke-width="1.8" stroke-dasharray="3 3" opacity="0.52"/>`;
    }
    if (vp.y1 < size - 1) {
      gridLines += `<line x1="${posX}" y1="${botY}" x2="${posX}" y2="${botY + tail}" stroke="${palette.line}" stroke-width="1.8" stroke-dasharray="3 3" opacity="0.52"/>`;
    }
  }

  // Star points inside viewport
  const stars = getStarPoints(size)
    .filter(([sx, sy]) => inVp(sx, sy))
    .map(([sx, sy]) => `<circle cx="${px(sx)}" cy="${py(sy)}" r="${viewSpan <= 4 ? 4.5 : 3.8}" fill="${palette.star}" opacity="0.8"/>`)
    .join('');

  // Energy connection bands between adjacent same-color stones
  const bands = analysis.connections
    .filter(({ a, b }) => inVp(a[0], a[1]) && inVp(b[0], b[1]))
    .map(({ a, b, color }) => {
      const stroke = color === 'black' ? '#38BDF8' : '#F59E0B';
      return `<line class="energy-band" x1="${px(a[0])}" y1="${py(a[1])}" x2="${px(b[0])}" y2="${py(b[1])}"
        stroke="${stroke}" stroke-width="${r * 0.48}" stroke-linecap="round"/>`;
    })
    .join('');

  // Stones inside viewport
  let stonesSvg = '';
  for (let y = vp.y0; y <= vp.y1; y++) {
    for (let x = vp.x0; x <= vp.x1; x++) {
      const color = board[y][x];
      if (!color) continue;
      const k = coordKey([x, y]);
      const grp = analysis.stoneMap.get(k);
      const status = grp ? grp.status : 'SAFE';
      const cx = px(x);
      const cy = py(y);
      const isFound = foundKeys.has(k);
      const isLast = lastMove && lastMove[0] === x && lastMove[1] === y;

      const fillUrl = color === 'black' ? 'url(#blackStoneGrad)' : 'url(#whiteStoneGrad)';
      const rim =
        status === 'ATARI'
          ? '#FF4B4B'
          : isFound
          ? '#58CC02'
          : color === 'black'
          ? '#11131C'
          : '#CBD5E1';
      const rimW = status === 'ATARI' || isFound ? 3 : 1.8;
      const animClass = status === 'ATARI' ? 'stone-atari' : status === 'SAFE' ? 'stone-safe' : '';

      stonesSvg += `
        <g class="${animClass}">
          <circle cx="${cx + 1.5}" cy="${cy + 3.2}" r="${r}" fill="rgba(0,0,0,0.22)"/>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillUrl}" stroke="${rim}" stroke-width="${rimW}"/>
          ${renderStoneFace(cx, cy, r, color, status, skin)}
          ${
            isLast
              ? `<circle cx="${cx}" cy="${cy + r * 0.56}" r="2.6" fill="#FFC800"/>`
              : ''
          }
          ${
            isFound
              ? `<circle cx="${cx}" cy="${cy}" r="${r * 1.18}" fill="none" stroke="#58CC02" stroke-width="2.5" stroke-dasharray="4 3"/>`
              : ''
          }
        </g>
      `;
    }
  }

  // Liberties layer
  let libertiesSvg = '';
  const shownLibKeys = new Set();

  if (levelType === 'find_liberty') {
    for (const key of targetLibertyKeys) {
      const [lx, ly] = key.split(',').map(Number);
      if (!inVp(lx, ly)) continue;
      const cx = px(lx);
      const cy = py(ly);
      if (foundKeys.has(key)) {
        libertiesSvg += `
          <g class="liberty-dot">
            <circle cx="${cx}" cy="${cy}" r="${r * 0.44}" fill="#58CC02" stroke="#fff" stroke-width="2.4"/>
            <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="14" fill="#fff" font-weight="900">✓</text>
          </g>
        `;
      } else if (scaffoldMode === 'all_liberties') {
        libertiesSvg += `
          <circle class="liberty-dot" cx="${cx}" cy="${cy}" r="${r * 0.36}" fill="rgba(56,189,248,0.28)"
            stroke="#0EA5E9" stroke-width="2.4" stroke-dasharray="4 3"/>
        `;
      }
    }
  } else {
    for (const grp of analysis.groups) {
      const showByScaffold =
        scaffoldMode === 'all_liberties' ||
        (scaffoldMode === 'atari_only' && grp.status === 'ATARI') ||
        (inspectedGroupId !== null && grp.id === inspectedGroupId);

      if (!showByScaffold) continue;
      for (const [lx, ly] of grp.liberties) {
        if (!inVp(lx, ly)) continue;
        const key = `${lx},${ly}`;
        if (shownLibKeys.has(key) && grp.status !== 'ATARI') continue;
        shownLibKeys.add(key);
        const cx = px(lx);
        const cy = py(ly);
        if (grp.status === 'ATARI') {
          libertiesSvg += `
            <circle class="liberty-dot" cx="${cx}" cy="${cy}" r="${r * 0.34}"
              fill="rgba(255,75,75,0.24)" stroke="#FF4B4B" stroke-width="2.6"/>
          `;
        } else {
          libertiesSvg += `
            <circle class="liberty-dot" cx="${cx}" cy="${cy}" r="${r * 0.22}"
              fill="#38BDF8" stroke="#fff" stroke-width="1.6" opacity="0.9"/>
          `;
        }
      }
    }
  }

  // Hint ring (shown after wrong move)
  let hintSvg = '';
  if (hintCoord && inVp(hintCoord[0], hintCoord[1])) {
    const [hx, hy] = hintCoord;
    hintSvg = `
      <circle class="hint-ring" cx="${px(hx)}" cy="${py(hy)}" r="${r * 0.65}"
        fill="rgba(255,200,0,0.24)" stroke="#FFC800" stroke-width="3.2"/>
    `;
  }

  // Forbidden / Suicide marker
  let forbiddenSvg = '';
  if (forbiddenCoord && inVp(forbiddenCoord[0], forbiddenCoord[1])) {
    const [fx, fy] = forbiddenCoord;
    const cx = px(fx);
    const cy = py(fy);
    forbiddenSvg = `
      <g>
        <circle cx="${cx}" cy="${cy}" r="${r * 0.66}" fill="rgba(255,75,75,0.25)" stroke="#FF4B4B" stroke-width="3"/>
        <line x1="${cx - 9}" y1="${cy - 9}" x2="${cx + 9}" y2="${cy + 9}" stroke="#FF4B4B" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="${cx + 9}" y1="${cy - 9}" x2="${cx - 9}" y2="${cy + 9}" stroke="#FF4B4B" stroke-width="3.5" stroke-linecap="round"/>
      </g>
    `;
  }

  // Capture explosion particles
  const burstSvg = captureBursts
    .filter(([bx, by]) => inVp(bx, by))
    .map(([bx, by]) => {
      const cx = px(bx);
      const cy = py(by);
      const offsets = [
        [-22, -26],
        [22, -24],
        [-24, 18],
        [24, 20],
        [0, -34],
      ];
      return offsets
        .map(
          ([ox, oy], idx) => `
          <circle class="capture-particle" cx="${cx}" cy="${cy}" r="${idx % 2 === 0 ? 5.5 : 4}"
            fill="${idx % 2 === 0 ? '#58CC02' : '#FFC800'}"
            style="--tx:${ox}px; --ty:${oy}px;"/>
        `
        )
        .join('');
    })
    .join('');

  // D-Pad / keyboard cursor highlight
  let cursorSvg = '';
  if (cursorCoord && inVp(cursorCoord[0], cursorCoord[1])) {
    const cx = px(cursorCoord[0]);
    const cy = py(cursorCoord[1]);
    cursorSvg = `
      <g class="dpad-cursor" pointer-events="none">
        <rect x="${cx - r * 1.18}" y="${cy - r * 1.18}" width="${r * 2.36}" height="${r * 2.36}"
          rx="${r * 0.42}" fill="rgba(56,189,248,0.16)" stroke="#38BDF8" stroke-width="3.2" />
        <circle cx="${cx}" cy="${cy}" r="${r * 0.24}" fill="#38BDF8" opacity="0.88" />
      </g>
    `;
  }

  // Invisible generous hit targets for viewport intersections
  let hitTargets = '';
  for (let y = vp.y0; y <= vp.y1; y++) {
    for (let x = vp.x0; x <= vp.x1; x++) {
      hitTargets += `<circle cx="${px(x)}" cy="${py(y)}" r="${cell * 0.48}" fill="transparent"
        data-x="${x}" data-y="${y}" style="cursor:pointer"/>`;
    }
  }

  return `
    <svg class="board-svg" viewBox="0 0 400 400" role="grid" aria-label="${size}x${size}围棋棋盘">
      <defs>
        <radialGradient id="blackStoneGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#4B4F6B"/>
          <stop offset="65%" stop-color="#252838"/>
          <stop offset="100%" stop-color="#141620"/>
        </radialGradient>
        <radialGradient id="whiteStoneGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="70%" stop-color="#F1F5F9"/>
          <stop offset="100%" stop-color="#CBD5E1"/>
        </radialGradient>
      </defs>
      ${gridLines}
      ${stars}
      ${bands}
      ${stonesSvg}
      ${libertiesSvg}
      ${hintSvg}
      ${forbiddenSvg}
      ${burstSvg}
      ${cursorSvg}
      ${hitTargets}
    </svg>
  `;
}
