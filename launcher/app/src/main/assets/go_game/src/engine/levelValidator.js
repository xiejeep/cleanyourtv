import {
  placeInitialStones,
  analyzeBoard,
  tryPlayStone,
  inBounds,
  coordKey,
  applyD4ToLevel,
} from './goEngine.js';
import { chooseBossMove } from './pandaAI.js';

export function validateSingleLevel(rawLevel) {
  const errors = [];
  if (!rawLevel || !rawLevel.id) {
    return { valid: false, errors: ['Missing level or level.id'] };
  }
  if (!Number.isInteger(rawLevel.boardSize) || rawLevel.boardSize < 5 || rawLevel.boardSize > 19) {
    errors.push(`Invalid boardSize: ${rawLevel.boardSize}`);
  }

  const d4Variants = rawLevel.enableD4Transform ? [0, 1, 2, 3, 4, 5, 6, 7] : [0];

  for (const d4 of d4Variants) {
    const level = applyD4ToLevel(rawLevel, d4);
    const size = level.boardSize;
    const tag = d4 === 0 ? '' : `[D4=${d4}] `;

    const seen = new Set();
    for (const color of ['black', 'white']) {
      for (const [x, y] of level.initialStones[color] || []) {
        if (!inBounds(x, y, size)) errors.push(`${tag}Out of bounds ${color} stone [${x},${y}]`);
        const k = `${x},${y}`;
        if (seen.has(k)) errors.push(`${tag}Overlapping initial stone at [${x},${y}]`);
        seen.add(k);
      }
    }

    const board = placeInitialStones(size, level.initialStones);
    const initAnalysis = analyzeBoard(board);
    for (const grp of initAnalysis.groups) {
      if (grp.liberties.length === 0) {
        errors.push(`${tag}Initial board contains 0-liberty dead group (${grp.color})`);
      }
    }

    if (level.type === 'find_liberty') {
      if (!level.targetLiberties || level.targetLiberties.length === 0) {
        errors.push(`${tag}find_liberty requires targetLiberties`);
      } else {
        const targetKeys = new Set();
        if (level.targetStones && level.targetStones.length > 0) {
          for (const s of level.targetStones) {
            const g = initAnalysis.stoneMap.get(coordKey(s));
            if (!g) errors.push(`${tag}targetStone [${s}] not found on board`);
            else g.liberties.forEach((l) => targetKeys.add(coordKey(l)));
          }
        } else {
          for (const g of initAnalysis.groups) {
            g.liberties.forEach((l) => targetKeys.add(coordKey(l)));
          }
        }
        const expectedKeys = new Set(level.targetLiberties.map(coordKey));
        if (
          targetKeys.size !== expectedKeys.size ||
          ![...expectedKeys].every((k) => targetKeys.has(k))
        ) {
          errors.push(
            `${tag}targetLiberties mismatch: expected [${[...targetKeys].join(';')}], got [${[...expectedKeys].join(';')}]`
          );
        }
      }
    } else if (level.type === 'find_atari') {
      if (!level.targetStones || level.targetStones.length === 0) {
        errors.push(`${tag}find_atari requires targetStones`);
      } else {
        const atariStones = new Set();
        for (const g of initAnalysis.groups) {
          if (g.status === 'ATARI') {
            g.stones.forEach((s) => atariStones.add(coordKey(s)));
          }
        }
        const expected = new Set(level.targetStones.map(coordKey));
        if (
          atariStones.size !== expected.size ||
          ![...expected].every((k) => atariStones.has(k))
        ) {
          errors.push(
            `${tag}find_atari targetStones mismatch: actual atari [${[...atariStones].join(';')}], got [${[...expected].join(';')}]`
          );
        }
      }
    } else if (level.type === 'single_move') {
      if (!level.validMoves || level.validMoves.length === 0) {
        errors.push(`${tag}single_move requires validMoves`);
      } else {
        const blackBefore = initAnalysis.groups.filter((g) => g.color === 'black');
        const whiteBefore = initAnalysis.groups.filter((g) => g.color === 'white');
        const atariBlackBefore = blackBefore.filter((g) => g.status === 'ATARI').length;
        const atariWhiteBefore = whiteBefore.filter((g) => g.status === 'ATARI').length;

        for (const mv of level.validMoves) {
          if (!inBounds(mv[0], mv[1], size)) {
            errors.push(`${tag}validMove [${mv}] out of bounds`);
            continue;
          }
          const res = tryPlayStone(board, mv, 'black');
          if (!res.valid) {
            errors.push(`${tag}validMove [${mv}] is illegal: ${res.reason}`);
            continue;
          }
          const after = analyzeBoard(res.nextBoard);
          const selfGrp = after.stoneMap.get(coordKey(mv));
          const selfLibs = selfGrp ? selfGrp.liberties.length : 0;
          const blackAfter = after.groups.filter((g) => g.color === 'black');
          const whiteAfter = after.groups.filter((g) => g.color === 'white');
          const atariBlackAfter = blackAfter.filter((g) => g.status === 'ATARI').length;
          const atariWhiteAfter = whiteAfter.filter((g) => g.status === 'ATARI').length;

          if (level.target === 'capture' && res.captured.length === 0) {
            errors.push(`${tag}target=capture move [${mv}] captured 0 stones`);
          }
          if (level.target === 'escape') {
            if (res.captured.length === 0 && selfLibs < 2) {
              errors.push(`${tag}target=escape move [${mv}] leaves self with ${selfLibs} liberty`);
            }
            if (atariBlackBefore > 0 && atariBlackAfter >= atariBlackBefore && res.captured.length === 0) {
              errors.push(`${tag}target=escape move [${mv}] did not save atari black group`);
            }
          }
          if (level.target === 'connect') {
            if (res.captured.length === 0 && selfLibs < 2) {
              errors.push(`${tag}target=connect move [${mv}] leaves self with ${selfLibs} liberty`);
            }
            if (
              blackAfter.length >= blackBefore.length &&
              atariBlackAfter >= atariBlackBefore &&
              res.captured.length === 0
            ) {
              errors.push(`${tag}target=connect move [${mv}] did not merge or save groups`);
            }
          }
          if (level.target === 'cut') {
            const cutSuccess =
              res.captured.length > 0 ||
              whiteAfter.length > whiteBefore.length ||
              atariWhiteAfter > atariWhiteBefore;
            if (!cutSuccess) {
              errors.push(`${tag}target=cut move [${mv}] did not split or atari white`);
            }
          }
          if ((level.target === 'tiger_mouth' || level.target === 'avoid_suicide') && res.captured.length === 0 && selfLibs < 2) {
            errors.push(`${tag}target=${level.target} move [${mv}] leaves self in atari`);
          }
        }
      }
    } else if (level.type === 'multi_step') {
      if (!level.steps || level.steps.length < 2) {
        errors.push(`${tag}multi_step requires at least 2 steps`);
      } else {
        let curBoard = board;
        for (let i = 0; i < level.steps.length; i++) {
          const step = level.steps[i];
          if (!step.expectedMoves || step.expectedMoves.length === 0) {
            errors.push(`${tag}step ${i} missing expectedMoves`);
            break;
          }
          for (const em of step.expectedMoves) {
            const check = tryPlayStone(curBoard, em, 'black');
            if (!check.valid) {
              errors.push(`${tag}step ${i} expectedMove [${em}] illegal: ${check.reason}`);
            }
          }
          const res = tryPlayStone(curBoard, step.expectedMoves[0], 'black');
          if (!res.valid) break;
          curBoard = res.nextBoard;

          if (i < level.steps.length - 1) {
            if (!step.aiReply) {
              errors.push(`${tag}step ${i} missing aiReply`);
              break;
            }
            const aiRes = tryPlayStone(curBoard, step.aiReply, 'white');
            if (!aiRes.valid) {
              errors.push(`${tag}step ${i} aiReply [${step.aiReply}] illegal: ${aiRes.reason}`);
              break;
            }
            curBoard = aiRes.nextBoard;
          } else {
            const finalAnalysis = analyzeBoard(curBoard);
            const finalSelf = finalAnalysis.stoneMap.get(coordKey(step.expectedMoves[0]));
            if (level.target === 'capture' && res.captured.length === 0) {
              errors.push(`${tag}multi_step final capture captured 0 stones`);
            }
            if (level.target === 'escape' && res.captured.length === 0 && (!finalSelf || finalSelf.liberties.length < 2)) {
              errors.push(`${tag}multi_step final escape leaves self in danger`);
            }
          }
        }
      }
    } else if (level.type === 'boss_battle') {
      if (!level.bossGoalCaptures || level.bossGoalCaptures < 1) {
        errors.push(`${tag}boss_battle requires bossGoalCaptures >= 1`);
      }
      const aiMove = chooseBossMove(board, 'white', level.unitId);
      if (!aiMove) {
        errors.push(`${tag}boss_battle AI returned null on initial board`);
      }
    } else if (level.type === 'sgf_tree') {
      if (!level.sgfTree || !level.sgfTree.children || level.sgfTree.children.length === 0) {
        errors.push(`${tag}sgf_tree missing sgfTree children`);
      } else {
        let correctLeafCount = 0;
        const walkTree = (node, curBoard) => {
          for (const child of node.children || []) {
            if (!child.move || !child.color) {
              errors.push(`${tag}sgf_tree node missing move or color`);
              continue;
            }
            if (!inBounds(child.move[0], child.move[1], size)) {
              errors.push(`${tag}sgf_tree move [${child.move}] out of bounds`);
              continue;
            }
            const res = tryPlayStone(curBoard, child.move, child.color);
            if (!res.valid) {
              errors.push(`${tag}sgf_tree move ${child.color}[${child.move}] illegal: ${res.reason}`);
              continue;
            }
            if (!child.children || child.children.length === 0) {
              if (child.isCorrect) {
                correctLeafCount += 1;
                if (level.target === 'capture' && child.color === 'black' && res.captured.length === 0) {
                  errors.push(`${tag}sgf_tree correct leaf ${child.color}[${child.move}] captured 0 stones`);
                }
              }
            } else {
              walkTree(child, res.nextBoard);
            }
          }
        };
        walkTree(level.sgfTree, board);
        if (correctLeafCount === 0) {
          errors.push(`${tag}sgf_tree has no valid correct leaf path`);
        }
      }
    } else {
      errors.push(`${tag}Unknown level type: ${level.type}`);
    }

    if (level.wrongConsequences) {
      for (const wc of level.wrongConsequences) {
        if (!inBounds(wc.move[0], wc.move[1], size) || board[wc.move[1]][wc.move[0]] !== null) {
          errors.push(`${tag}wrongConsequence move [${wc.move}] not on empty intersection`);
          continue;
        }
        const bTry = tryPlayStone(board, wc.move, 'black');
        if (wc.aiCounterMove && bTry.valid) {
          const wTry = tryPlayStone(bTry.nextBoard, wc.aiCounterMove, 'white');
          if (!wTry.valid) {
            errors.push(`${tag}wrongConsequence aiCounterMove [${wc.aiCounterMove}] illegal after [${wc.move}]`);
          }
        }
      }
    }

    if (errors.length > 0) break;
  }

  return { valid: errors.length === 0, errors };
}

export function validateAllLevels(levels) {
  const results = [];
  const idSet = new Set();
  for (const lvl of levels) {
    const res = validateSingleLevel(lvl);
    if (idSet.has(lvl.id)) {
      res.valid = false;
      res.errors.push(`Duplicate level id: ${lvl.id}`);
    }
    idSet.add(lvl.id);
    results.push({ id: lvl.id, nodeId: lvl.nodeId, type: lvl.type, ...res });
  }
  const passed = results.filter((r) => r.valid).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}
