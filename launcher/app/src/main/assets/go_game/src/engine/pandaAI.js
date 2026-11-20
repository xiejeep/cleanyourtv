import { analyzeBoard, tryPlayStone, OPPONENT, getNeighbors } from './goEngine.js';

/**
 * 专为 5×5 / 7×7 吃子 Boss 战设计的“启发式懂让棋 AI”
 * unitId = 1 时破绽率较高 (~30%)，适合初步掌握气与吃子的孩子
 * unitId = 2 时破绽率适中 (~18%)，会偶留断点与浅虎口供孩子发掘
 */
export function chooseBossMove(board, aiColor = 'white', unitId = 1) {
  const size = board.length;
  const playerColor = OPPONENT[aiColor];
  const before = analyzeBoard(board);
  const candidates = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] !== null) continue;
      const res = tryPlayStone(board, [x, y], aiColor);
      if (!res.valid) continue;

      const after = analyzeBoard(res.nextBoard);
      const myGroup = after.stoneMap.get(`${x},${y}`);
      const myLibs = myGroup ? myGroup.liberties.length : 0;

      // 避免无意义的纯1气自撞虎口（除非能提子，提子上面已包含在 captured 中）
      if (res.captured.length === 0 && myLibs <= 1) {
        candidates.push({ move: [x, y], score: -50 + Math.random() * 5 });
        continue;
      }

      let score = 0;

      // 1. 直接提子奖励（优先吃掉玩家棋子，但让孩子先手时也会留些机会）
      if (res.captured.length > 0) {
        score += 120 + res.captured.length * 25;
      }

      // 2. 解救己方濒死棋块（从1气救出）
      const aiAtariBefore = before.groups.filter((g) => g.color === aiColor && g.status === 'ATARI');
      const aiAtariAfter = after.groups.filter((g) => g.color === aiColor && g.status === 'ATARI');
      if (aiAtariAfter.length < aiAtariBefore.length) {
        score += 65;
      }

      // 3. 给玩家棋块紧气/制造打吃
      const playerAtariBefore = before.groups.filter((g) => g.color === playerColor && g.status === 'ATARI').length;
      const playerAtariAfter = after.groups.filter((g) => g.color === playerColor && g.status === 'ATARI').length;
      if (playerAtariAfter > playerAtariBefore) {
        score += 48;
      }

      // 4. 偏好靠近中腹、远离绝地边角
      const centerDist = Math.abs(x - (size - 1) / 2) + Math.abs(y - (size - 1) / 2);
      score += Math.max(0, 8 - centerDist * 2);
      score += Math.min(myLibs, 4) * 4;

      // 5. 连接相邻棋友加分
      const friendlyNeighbors = getNeighbors([x, y], size).filter(
        ([nx, ny]) => board[ny][nx] === aiColor
      ).length;
      score += friendlyNeighbors * 5;

      // 轻微随机扰动
      score += Math.random() * 8;
      candidates.push({ move: [x, y], score });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);

  // 可爱破绽机制：适当走次优着法，让孩子能用刚学到的打吃/断点赢过阿竹
  const mistakeRate = unitId === 1 ? 0.32 : 0.18;
  const nonSuicide = candidates.filter((c) => c.score > -20);
  const pool = nonSuicide.length > 0 ? nonSuicide : candidates;

  if (pool.length > 2 && Math.random() < mistakeRate) {
    const pickIdx = Math.min(pool.length - 1, 1 + Math.floor(Math.random() * Math.min(3, pool.length - 1)));
    return pool[pickIdx].move;
  }

  return pool[0].move;
}

/**
 * 当某关卡走错且未显式配置 wrongConsequences 演示脚本时，
 * 动态推演一个最直观的“反吃/惩罚演示步”，让孩子看明白为什么不能这样下。
 */
export function computeDynamicConsequence(boardAfterWrong, wrongMove, levelTarget) {
  const analysis = analyzeBoard(boardAfterWrong);
  const whiteTryList = [];
  const size = boardAfterWrong.length;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (boardAfterWrong[y][x] !== null) continue;
      const res = tryPlayStone(boardAfterWrong, [x, y], 'white');
      if (res.valid && res.captured.length > 0) {
        whiteTryList.push({ move: [x, y], captured: res.captured });
      }
    }
  }

  // 优先演示：白棋立刻反吃掉棋盘上的黑子
  if (whiteTryList.length > 0) {
    whiteTryList.sort((a, b) => b.captured.length - a.captured.length);
    const best = whiteTryList[0];
    const hitSelf = best.captured.some(([cx, cy]) => cx === wrongMove[0] && cy === wrongMove[1]);
    return {
      aiCounterMove: best.move,
      capturedPreview: best.captured,
      coachFeedback: hitSelf
        ? '哎呀！跳进危险地带，直接被吃掉啦！'
        : '没保护好同伴，阿竹一口把黑棋吃掉啦！',
    };
  }

  // 其次演示：若是吃子题/追击题没抓紧，白棋趁机长气逃跑
  const whiteAtari = analysis.groups.find((g) => g.color === 'white' && g.status === 'ATARI');
  if (whiteAtari && whiteAtari.liberties.length === 1) {
    const escapeMove = whiteAtari.liberties[0];
    const res = tryPlayStone(boardAfterWrong, escapeMove, 'white');
    if (res.valid) {
      const nextInfo = analyzeBoard(res.nextBoard);
      const escapedGrp = nextInfo.stoneMap.get(`${escapeMove[0]},${escapeMove[1]}`);
      const escapedLibs = escapedGrp ? escapedGrp.liberties.length : 0;
      return {
        aiCounterMove: escapeMove,
        capturedPreview: [],
        coachFeedback:
          levelTarget === 'capture'
            ? escapedLibs >= 2
              ? '哈哈！从这边打吃我就能逃出两口气啦，换个方向试试！'
              : '呀！没堵住最后一口气，阿竹趁机逃跑啦！'
            : '再仔细看看气点，阿竹差一点就溜走咯！',
      };
    }
  }

  return {
    aiCounterMove: null,
    capturedPreview: [],
    coachFeedback: '再想一想！观察一下哪颗棋子最危急哦～',
  };
}
