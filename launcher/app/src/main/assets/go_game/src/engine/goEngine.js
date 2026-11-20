export const OPPONENT = { black: 'white', white: 'black' };

export function createBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function placeInitialStones(size, initialStones = { black: [], white: [] }) {
  const board = createBoard(size);
  for (const [x, y] of initialStones.black || []) {
    if (inBounds(x, y, size)) board[y][x] = 'black';
  }
  for (const [x, y] of initialStones.white || []) {
    if (inBounds(x, y, size)) board[y][x] = 'white';
  }
  return board;
}

export function inBounds(x, y, size) {
  return x >= 0 && x < size && y >= 0 && y < size;
}

export function coordKey([x, y]) {
  return `${x},${y}`;
}

export function sameCoord(a, b) {
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1]);
}

export function getNeighbors([x, y], size) {
  const dirs = [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ];
  return dirs.filter(([nx, ny]) => inBounds(nx, ny, size));
}

export function analyzeBoard(board) {
  const size = board.length;
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const groups = [];
  const stoneMap = new Map();
  const connections = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const color = board[y][x];
      if (!color) continue;

      if (x + 1 < size && board[y][x + 1] === color) {
        connections.push({ a: [x, y], b: [x + 1, y], color });
      }
      if (y + 1 < size && board[y + 1][x] === color) {
        connections.push({ a: [x, y], b: [x, y + 1], color });
      }

      if (visited[y][x]) continue;

      const queue = [[x, y]];
      visited[y][x] = true;
      const stones = [];
      const libertySet = new Map();

      while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        stones.push([cx, cy]);
        for (const [nx, ny] of getNeighbors([cx, cy], size)) {
          const neighborColor = board[ny][nx];
          if (neighborColor === null) {
            libertySet.set(`${nx},${ny}`, [nx, ny]);
          } else if (neighborColor === color && !visited[ny][nx]) {
            visited[ny][nx] = true;
            queue.push([nx, ny]);
          }
        }
      }

      const liberties = Array.from(libertySet.values());
      const libCount = liberties.length;
      const status = libCount <= 1 ? 'ATARI' : libCount === 2 ? 'CAUTION' : 'SAFE';
      const group = {
        id: groups.length,
        color,
        stones,
        liberties,
        status,
      };
      groups.push(group);
      for (const s of stones) {
        stoneMap.set(coordKey(s), group);
      }
    }
  }

  return { groups, stoneMap, connections };
}

export function tryPlayStone(board, move, color) {
  const size = board.length;
  const [x, y] = move;
  if (!inBounds(x, y, size) || board[y][x] !== null) {
    return { valid: false, reason: 'occupied', nextBoard: board, captured: [] };
  }

  const nextBoard = cloneBoard(board);
  nextBoard[y][x] = color;

  const opp = OPPONENT[color];
  const afterPlace = analyzeBoard(nextBoard);
  const captured = [];
  const capturedGroupIds = new Set();

  for (const [nx, ny] of getNeighbors([x, y], size)) {
    if (nextBoard[ny][nx] !== opp) continue;
    const grp = afterPlace.stoneMap.get(`${nx},${ny}`);
    if (grp && grp.liberties.length === 0 && !capturedGroupIds.has(grp.id)) {
      capturedGroupIds.add(grp.id);
      for (const [sx, sy] of grp.stones) {
        nextBoard[sy][sx] = null;
        captured.push([sx, sy]);
      }
    }
  }

  const afterCapture = analyzeBoard(nextBoard);
  const selfGroup = afterCapture.stoneMap.get(`${x},${y}`);
  if (!selfGroup || selfGroup.liberties.length === 0) {
    return { valid: false, reason: 'suicide', nextBoard: board, captured: [] };
  }

  return { valid: true, nextBoard, captured };
}

export function transformCoord([x, y], size, d4Index) {
  const idx = ((d4Index % 8) + 8) % 8;
  const mx = (idx & 4) !== 0 ? size - 1 - x : x;
  const my = y;
  const rot = idx & 3;
  if (rot === 1) return [size - 1 - my, mx];
  if (rot === 2) return [size - 1 - mx, size - 1 - my];
  if (rot === 3) return [my, size - 1 - mx];
  return [mx, my];
}

export function applyD4ToLevel(level, d4Index = 0) {
  if (!level.enableD4Transform || d4Index % 8 === 0) {
    return level;
  }
  const size = level.boardSize;
  const t = (c) => transformCoord(c, size, d4Index);
  const tList = (arr) => (arr ? arr.map(t) : undefined);

  return {
    ...level,
    initialStones: {
      black: tList(level.initialStones.black) || [],
      white: tList(level.initialStones.white) || [],
    },
    validMoves: tList(level.validMoves),
    targetStones: tList(level.targetStones),
    targetLiberties: tList(level.targetLiberties),
    steps: level.steps
      ? level.steps.map((step) => ({
          ...step,
          expectedMoves: tList(step.expectedMoves),
          aiReply: step.aiReply ? t(step.aiReply) : undefined,
        }))
      : undefined,
    wrongConsequences: level.wrongConsequences
      ? level.wrongConsequences.map((wc) => ({
          ...wc,
          move: t(wc.move),
          aiCounterMove: wc.aiCounterMove ? t(wc.aiCounterMove) : undefined,
          capturedPreview: tList(wc.capturedPreview),
        }))
      : undefined,
  };
}
