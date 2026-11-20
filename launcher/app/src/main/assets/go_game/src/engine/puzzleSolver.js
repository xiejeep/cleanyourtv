import { analyzeBoard, tryPlayStone, coordKey } from './goEngine.js';

function collectWhiteDefenses(board) {
  const analysis = analyzeBoard(board);
  const defenses = new Map();

  for (const grp of analysis.groups) {
    if (grp.color === 'white' && grp.status === 'ATARI' && grp.liberties.length === 1) {
      const lib = grp.liberties[0];
      defenses.set(coordKey(lib), lib);
    }
    if (grp.color === 'black' && grp.status === 'ATARI' && grp.liberties.length === 1) {
      const lib = grp.liberties[0];
      defenses.set(coordKey(lib), lib);
    }
  }

  return Array.from(defenses.values());
}

/**
 * 精确极小极大搜索：找出黑棋在 maxBlackMoves 手内能够必然提吃至少 1 颗白子的所有必胜着法。
 * 数学剪枝：只有白棋 <= 2 气的棋块的气点，才可能立刻提子或把白棋打成 1 气。
 */
export function findForcedCaptureMoves(board, maxBlackMoves = 2) {
  if (maxBlackMoves <= 0) return [];

  const analysis = analyzeBoard(board);
  const candidateMap = new Map();

  for (const grp of analysis.groups) {
    if (grp.color === 'white' && grp.liberties.length <= 2) {
      for (const lib of grp.liberties) {
        candidateMap.set(coordKey(lib), lib);
      }
    }
  }

  const winningMoves = [];

  for (const move of candidateMap.values()) {
    const res = tryPlayStone(board, move, 'black');
    if (!res.valid) continue;

    if (res.captured.length > 0) {
      winningMoves.push(move);
      continue;
    }

    if (maxBlackMoves <= 1) continue;

    const afterAnalysis = analyzeBoard(res.nextBoard);
    const whiteAtari = afterAnalysis.groups.filter((g) => g.color === 'white' && g.status === 'ATARI');
    if (whiteAtari.length === 0) continue;

    const defenses = collectWhiteDefenses(res.nextBoard);
    let hasLegalDefense = false;
    let allDefensesLose = true;

    for (const def of defenses) {
      const wRes = tryPlayStone(res.nextBoard, def, 'white');
      if (!wRes.valid) continue;
      hasLegalDefense = true;
      const followUps = findForcedCaptureMoves(wRes.nextBoard, maxBlackMoves - 1);
      if (followUps.length === 0) {
        allDefensesLose = false;
        break;
      }
    }

    if (!hasLegalDefense) {
      const nextFollowUps = findForcedCaptureMoves(res.nextBoard, maxBlackMoves - 1);
      if (nextFollowUps.length > 0) {
        winningMoves.push(move);
      }
    } else if (allDefensesLose) {
      winningMoves.push(move);
    }
  }

  return winningMoves;
}

/**
 * 判断单步题（single_move）是否存在同样达成核心战术目标的等效落子。
 */
export function isValidAlternativeSingleMove(board, move, level) {
  const res = tryPlayStone(board, move, 'black');
  if (!res.valid) return false;

  const before = analyzeBoard(board);
  const after = analyzeBoard(res.nextBoard);
  const blackAtariBefore = before.groups.filter((g) => g.color === 'black' && g.status === 'ATARI').length;
  const blackAtariAfter = after.groups.filter((g) => g.color === 'black' && g.status === 'ATARI').length;
  const selfGroup = after.stoneMap.get(coordKey(move));
  const selfLibs = selfGroup ? selfGroup.liberties.length : 0;

  if (level.target === 'capture') {
    if (res.captured.length === 0) return false;
    if (blackAtariBefore > 0 && blackAtariAfter >= blackAtariBefore) return false;
    return selfLibs >= 2 || blackAtariAfter < blackAtariBefore;
  }

  if (level.target === 'escape') {
    if (blackAtariBefore === 0) return false;
    return blackAtariAfter < blackAtariBefore && selfLibs >= 2;
  }

  return false;
}

/**
 * 在玩家选择另一侧有效打吃方向后，为阿竹选择最合理的挣扎应对步。
 * 若白棋唯一气点属自杀禁入点且无反提手段，返回 null（由玩家直接提子）。
 */
export function chooseDynamicWhiteDefense(boardAfterBlack) {
  const analysis = analyzeBoard(boardAfterBlack);
  const escapeOptions = [];

  for (const grp of analysis.groups) {
    if (grp.color === 'white' && grp.status === 'ATARI' && grp.liberties.length === 1) {
      const lib = grp.liberties[0];
      const wRes = tryPlayStone(boardAfterBlack, lib, 'white');
      if (wRes.valid) {
        const nextInfo = analyzeBoard(wRes.nextBoard);
        const wGrp = nextInfo.stoneMap.get(coordKey(lib));
        const libs = wGrp ? wGrp.liberties.length : 0;
        escapeOptions.push({ move: lib, score: libs * 10 + wRes.captured.length * 50 });
      }
    }
  }

  if (escapeOptions.length > 0) {
    escapeOptions.sort((a, b) => b.score - a.score);
    return escapeOptions[0].move;
  }

  for (const grp of analysis.groups) {
    if (grp.color === 'black' && grp.status === 'ATARI' && grp.liberties.length === 1) {
      const lib = grp.liberties[0];
      const wRes = tryPlayStone(boardAfterBlack, lib, 'white');
      if (wRes.valid && wRes.captured.length > 0) {
        return lib;
      }
    }
  }

  return null;
}
