import {
  placeInitialStones,
  tryPlayStone,
  analyzeBoard,
  coordKey,
  sameCoord,
  applyD4ToLevel,
} from '../engine/goEngine.js';
import { chooseBossMove, computeDynamicConsequence } from '../engine/pandaAI.js';
import {
  findForcedCaptureMoves,
  isValidAlternativeSingleMove,
  chooseDynamicWhiteDefense,
} from '../engine/puzzleSolver.js';
import { soundEngine } from '../engine/audio.js';
import { renderCoachBox } from './CoachBamboo.js';
import { renderBoardSVG } from './BoardSVG.js';
import { BADGES } from '../data/catalog.js';
import { store } from '../state/store.js';
import { notifyTvLevelPassed } from '../state/tvBridge.js';

export class LessonRunner {
  constructor({ root, levels, sessionMeta, onExit, onWinExit = null, onBackToMap = null }) {
    this.root = root;
    this.onExit = onExit;
    this.onWinExit = onWinExit;
    this.onBackToMap = onBackToMap;
    this.sessionMeta = sessionMeta; // { sessionId, title, nodeId, badgeId, isNodeEnd }
    this.queue = levels.map((raw) => ({ rawLevel: raw, isRetry: false }));
    this.queueIndex = 0;
    this.totalInitial = levels.length;
    this.firstPassMistakes = new Set();
    this.finishedSession = false;
    this.timers = [];
    this.cursorCoord = null;
    this.onKeyDown = (e) => this.handleKeyDown(e);
    window.addEventListener('keydown', this.onKeyDown);

    this.loadCurrentLevel();
  }

  clearTimers() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  setTimer(fn, ms) {
    const id = setTimeout(() => {
      this.timers = this.timers.filter((x) => x !== id);
      fn();
    }, ms);
    this.timers.push(id);
    return id;
  }

  destroy() {
    this.clearTimers();
    soundEngine.stopSpeech();
    if (this.onKeyDown) {
      window.removeEventListener('keydown', this.onKeyDown);
      this.onKeyDown = null;
    }
  }

  loadCurrentLevel() {
    this.clearTimers();
    const item = this.queue[this.queueIndex];
    const d4Index = item.isRetry && item.rawLevel.enableD4Transform
      ? 1 + Math.floor(Math.random() * 7)
      : 0;
    this.level = applyD4ToLevel(item.rawLevel, d4Index);
    this.isRetryItem = item.isRetry;
    this.hadMistakeThisLevel = false;
    this.stepIndex = 0;
    this.sgfNode = this.level.sgfTree || null;
    this.inDynamicBranch = false;
    this.remainingBlackMoves = this.level.steps ? this.level.steps.length : 1;
    this.board = placeInitialStones(this.level.boardSize, this.level.initialStones);
    this.foundKeys = new Set();
    this.inspectedGroupId = null;
    this.hintCoord = null;
    this.forbiddenCoord = null;
    this.lastMove = null;
    this.captureBursts = [];
    this.isAnimating = false;
    this.blackCaptures = 0;
    this.whiteCaptures = 0;
    this.bossDefeated = false;

    this.targetLibertyKeys = new Set((this.level.targetLiberties || []).map(coordKey));
    this.targetStoneKeys = new Set((this.level.targetStones || []).map(coordKey));
    const vp = this.level.viewport || {
      x0: 0,
      y0: 0,
      x1: this.level.boardSize - 1,
      y1: this.level.boardSize - 1,
    };
    this.cursorCoord = [
      Math.floor((vp.x0 + vp.x1) / 2),
      Math.floor((vp.y0 + vp.y1) / 2),
    ];

    this.coachMood = 'happy';
    this.coachText = this.level.coachPrompt;
    this.coachBounce = true;
    this.coachAlert = false;

    this.render();
    soundEngine.speak(this.coachText);
  }

  advanceLevel() {
    const currentItem = this.queue[this.queueIndex];
    if (this.hadMistakeThisLevel) {
      this.queue.push({ rawLevel: currentItem.rawLevel, isRetry: true });
    }
    this.queueIndex += 1;

    if (this.queueIndex >= this.queue.length) {
      this.completeSession();
      return;
    }
    this.loadCurrentLevel();
  }

  completeSession() {
    this.clearTimers();
    this.finishedSession = true;
    const mistakeCount = this.firstPassMistakes.size;
    const stars = mistakeCount === 0 ? 3 : mistakeCount <= 2 ? 2 : 1;
    const coinsEarned = this.sessionMeta.isSingleTest ? 5 : 10 + stars * 5;
    const levelIds = Array.from(new Set(this.queue.map((q) => q.rawLevel.id)));
    const { streakIncreased, badgeEarned } = store.recordSessionWin({
      sessionId: this.sessionMeta.sessionId,
      levelIds,
      stars,
      coinsEarned,
      badgeId: this.sessionMeta.badgeId,
    });

    this.winSummary = {
      stars,
      coinsEarned,
      streakIncreased,
      badge: badgeEarned ? BADGES.find((b) => b.id === this.sessionMeta.badgeId) : null,
      streakDays: store.getState().streakDays,
    };
    soundEngine.playWin();
    const bonusMin = this.sessionMeta.bonusMin || 30;
    soundEngine.speak(this.sessionMeta.isTvUnlock ? `闯关成功！已延长${bonusMin}分钟使用时间！` : '太棒啦！全部闯关成功！');
    if (this.sessionMeta.isTvUnlock) {
      const rewardKey = this.sessionMeta.sessionId || levelIds[0];
      if (rewardKey) notifyTvLevelPassed(rewardKey);
    }
    this.render();
  }

  handleCellClick(x, y) {
    if (this.isAnimating || this.finishedSession || this.bossDefeated) return;
    const lvl = this.level;
    const clicked = [x, y];
    const key = coordKey(clicked);

    if (lvl.type === 'find_liberty') {
      if (this.board[y][x] !== null) {
        if (lvl.scaffoldMode === 'tap_inspect') this.inspectAt(x, y);
        return;
      }
      if (this.targetLibertyKeys.has(key)) {
        if (!this.foundKeys.has(key)) {
          this.foundKeys.add(key);
          soundEngine.playTap();
          if (this.foundKeys.size === this.targetLibertyKeys.size) {
            this.isAnimating = true;
            this.coachMood = 'happy';
            this.coachText = `全找对啦！共有 ${this.targetLibertyKeys.size} 口气！`;
            this.coachBounce = true;
            this.coachAlert = false;
            soundEngine.playWin();
            this.render();
            this.setTimer(() => this.advanceLevel(), 850);
            return;
          }
          this.coachMood = 'happy';
          this.coachText = `找到 ${this.foundKeys.size}/${this.targetLibertyKeys.size} 口气啦，继续！`;
          this.coachBounce = false;
          this.render();
        }
      } else {
        this.markMistake();
        soundEngine.playWrong();
        this.forbiddenCoord = clicked;
        this.coachMood = 'nervous';
        this.coachText = '这里不是目标棋子的气哦，再找紧挨着它的交叉点！';
        this.coachAlert = true;
        this.render();
        soundEngine.speak(this.coachText);
        this.setTimer(() => {
          this.forbiddenCoord = null;
          this.render();
        }, 750);
      }
      return;
    }

    if (lvl.type === 'find_atari') {
      if (this.board[y][x] === null) return;
      if (this.targetStoneKeys.has(key)) {
        if (!this.foundKeys.has(key)) {
          this.foundKeys.add(key);
          soundEngine.playTap();
          if (this.foundKeys.size === this.targetStoneKeys.size) {
            this.isAnimating = true;
            this.coachMood = 'happy';
            this.coachText = '火眼金睛！就是这颗剩 1 口气的棋子！';
            this.coachBounce = true;
            this.coachAlert = false;
            soundEngine.playWin();
            this.render();
            this.setTimer(() => this.advanceLevel(), 850);
            return;
          }
          this.coachMood = 'happy';
          this.coachText = `点中啦！把相连的另外 ${this.targetStoneKeys.size - this.foundKeys.size} 颗也点出来！`;
          this.render();
        }
      } else {
        this.markMistake();
        this.inspectAt(x, y);
        soundEngine.playWrong();
        this.coachMood = 'thinking';
        this.coachText = '这颗棋子气很充足呢，找找只有 1 口气发抖的！';
        this.coachAlert = true;
        this.render();
        soundEngine.speak(this.coachText);
      }
      return;
    }

    if (this.board[y][x] !== null) {
      if (lvl.scaffoldMode === 'tap_inspect') {
        this.inspectAt(x, y);
      }
      return;
    }

    if (lvl.type === 'boss_battle') {
      this.handleBossMove(clicked);
      return;
    }

    if (lvl.type === 'sgf_tree') {
      this.handleSgfClick(clicked);
      return;
    }

    // single_move or multi_step
    if (lvl.type === 'single_move') {
      const expectedList = lvl.validMoves || [];
      const isExpected =
        expectedList.some((m) => sameCoord(m, clicked)) ||
        isValidAlternativeSingleMove(this.board, clicked, lvl);
      if (isExpected) {
        this.handleCorrectMove(clicked, expectedList);
      } else {
        this.handleWrongMove(clicked, expectedList[0]);
      }
      return;
    }

    // multi_step
    const expectedList = !this.inDynamicBranch
      ? lvl.steps[this.stepIndex].expectedMoves || []
      : [];

    if (!this.inDynamicBranch && expectedList.some((m) => sameCoord(m, clicked))) {
      this.handleCorrectMove(clicked, expectedList);
      return;
    }

    if (lvl.target === 'capture') {
      const quickTry = tryPlayStone(this.board, clicked, 'black');
      const forcedWins = findForcedCaptureMoves(this.board, this.remainingBlackMoves);
      if (
        (quickTry.valid && quickTry.captured.length > 0) ||
        forcedWins.some((m) => sameCoord(m, clicked))
      ) {
        this.handleDynamicCaptureMove(clicked);
        return;
      }
      const hintTarget = this.inDynamicBranch
        ? forcedWins[0]
        : expectedList[0] || forcedWins[0];
      this.handleWrongMove(clicked, hintTarget);
      return;
    }

    this.handleWrongMove(clicked, expectedList[0]);
  }

  inspectAt(x, y) {
    const analysis = analyzeBoard(this.board);
    const grp = analysis.stoneMap.get(coordKey([x, y]));
    if (!grp) return;
    this.inspectedGroupId = grp.id;
    soundEngine.playTap();
    this.render();
    this.setTimer(() => {
      if (this.inspectedGroupId === grp.id) {
        this.inspectedGroupId = null;
        this.render();
      }
    }, 1500);
  }

  markMistake() {
    this.hadMistakeThisLevel = true;
    this.firstPassMistakes.add(this.level.id);
  }

  handleCorrectMove(move, _expectedList) {
    const res = tryPlayStone(this.board, move, 'black');
    if (!res.valid) return;
    this.board = res.nextBoard;
    this.lastMove = move;
    this.hintCoord = null;
    this.inspectedGroupId = null;
    soundEngine.playStone();

    if (res.captured.length > 0) {
      this.captureBursts = res.captured;
      soundEngine.playCapture();
    } else if (this.level.target === 'connect') {
      soundEngine.playConnect();
    }

    if (this.level.type === 'single_move') {
      this.isAnimating = true;
      this.coachMood = res.captured.length > 0 ? 'shocked' : 'happy';
      this.coachText =
        res.captured.length > 0
          ? `哇！一口吃掉 ${res.captured.length} 颗棋子！`
          : this.level.target === 'connect'
          ? '好朋友手拉手连在一起啦！'
          : '漂亮！成功解围啦！';
      this.coachBounce = true;
      this.coachAlert = false;
      if (res.captured.length === 0) soundEngine.playWin();
      this.render();
      this.setTimer(() => {
        this.captureBursts = [];
        this.advanceLevel();
      }, 900);
      return;
    }

    // multi_step
    const step = this.level.steps[this.stepIndex];
    if (this.stepIndex >= this.level.steps.length - 1) {
      this.isAnimating = true;
      this.coachMood = 'crying';
      this.coachText = '呜哇！被你的连续妙手吃掉啦，太强了！';
      this.coachBounce = true;
      this.coachAlert = false;
      if (res.captured.length === 0) soundEngine.playWin();
      this.render();
      this.setTimer(() => {
        this.captureBursts = [];
        this.advanceLevel();
      }, 950);
      return;
    }

    // AI reply step
    this.isAnimating = true;
    this.coachMood = 'nervous';
    this.coachAlert = false;
    this.render();

    this.setTimer(() => {
      this.captureBursts = [];
      const aiRes = tryPlayStone(this.board, step.aiReply, 'white');
      if (aiRes.valid) {
        this.board = aiRes.nextBoard;
        this.lastMove = step.aiReply;
        soundEngine.playStone();
      }
      this.stepIndex += 1;
      this.remainingBlackMoves = Math.max(1, this.remainingBlackMoves - 1);
      this.isAnimating = false;
      this.coachMood = 'thinking';
      this.coachText = step.prompt || '阿竹应对啦，继续下一步！';
      this.coachBounce = true;
      this.render();
      soundEngine.speak(this.coachText);
    }, 450);
  }

  handleDynamicCaptureMove(move) {
    const res = tryPlayStone(this.board, move, 'black');
    if (!res.valid) return;
    this.board = res.nextBoard;
    this.lastMove = move;
    this.hintCoord = null;
    this.inspectedGroupId = null;
    soundEngine.playStone();

    if (res.captured.length > 0) {
      this.captureBursts = res.captured;
      soundEngine.playCapture();
      this.isAnimating = true;
      this.coachMood = 'crying';
      this.coachText = '呜哇！这招打吃也太厉害啦，全被你吃掉啦！';
      this.coachBounce = true;
      this.coachAlert = false;
      this.render();
      this.setTimer(() => {
        this.captureBursts = [];
        this.advanceLevel();
      }, 950);
      return;
    }

    this.inDynamicBranch = true;
    this.remainingBlackMoves = Math.max(1, this.remainingBlackMoves - 1);
    this.isAnimating = true;
    this.coachMood = 'nervous';
    this.coachAlert = false;
    this.render();

    this.setTimer(() => {
      this.captureBursts = [];
      const aiDefense = chooseDynamicWhiteDefense(this.board);
      if (aiDefense) {
        const aiRes = tryPlayStone(this.board, aiDefense, 'white');
        if (aiRes.valid) {
          this.board = aiRes.nextBoard;
          this.lastMove = aiDefense;
          soundEngine.playStone();
          if (aiRes.captured.length > 0) {
            this.captureBursts = aiRes.captured;
          }
        }
        this.isAnimating = false;
        this.coachMood = 'thinking';
        this.coachText = '从这边打吃也能逼住我！快吃掉最后一口气！';
      } else {
        this.isAnimating = false;
        this.coachMood = 'nervous';
        this.coachText = '糟糕，我无路可逃啦！最后一口气吃掉我吧！';
      }
      this.coachBounce = true;
      this.render();
      soundEngine.speak(this.coachText);
      if (this.captureBursts.length > 0) {
        this.setTimer(() => {
          this.captureBursts = [];
          this.render();
        }, 450);
      }
    }, 450);
  }

  handleWrongMove(wrongMove, hintTarget) {
    this.markMistake();
    const res = tryPlayStone(this.board, wrongMove, 'black');

    if (!res.valid && res.reason === 'suicide') {
      soundEngine.playWrong();
      this.forbiddenCoord = wrongMove;
      this.coachMood = 'shocked';
      this.coachText = '这里 0 口气是禁入点，不能自杀哦！';
      this.coachAlert = true;
      this.coachBounce = true;
      this.render();
      soundEngine.speak(this.coachText);
      this.setTimer(() => {
        this.forbiddenCoord = null;
        this.hintCoord = hintTarget;
        this.render();
      }, 950);
      return;
    }

    // 温和纠错：先放黑子 -> 0.35s后阿竹演示反吃/逃脱后果 -> 1.25s后回退并亮提示圈
    const boardSnapshot = this.board;
    const prevLastMove = this.lastMove;
    this.isAnimating = true;
    this.board = res.nextBoard;
    this.lastMove = wrongMove;
    soundEngine.playStone();
    this.render();

    const preset = (this.level.wrongConsequences || []).find((w) => sameCoord(w.move, wrongMove));
    const consequence =
      preset && preset.aiCounterMove
        ? preset
        : computeDynamicConsequence(res.nextBoard, wrongMove, this.level.target);

    this.setTimer(() => {
      if (consequence.aiCounterMove) {
        const aiRes = tryPlayStone(this.board, consequence.aiCounterMove, 'white');
        if (aiRes.valid) {
          this.board = aiRes.nextBoard;
          this.lastMove = consequence.aiCounterMove;
          this.captureBursts = aiRes.captured;
        }
      }
      soundEngine.playWrong();
      this.coachMood = 'smug';
      this.coachText = consequence.coachFeedback;
      this.coachAlert = true;
      this.coachBounce = true;
      this.render();
      soundEngine.speak(this.coachText);

      this.setTimer(() => {
        this.board = boardSnapshot;
        this.lastMove = prevLastMove;
        this.captureBursts = [];
        this.hintCoord = hintTarget;
        this.isAnimating = false;
        this.coachMood = 'thinking';
        this.coachText = '没关系，跟着金色圆圈提示再试一次！';
        this.coachAlert = false;
        this.render();
      }, 1300);
    }, 360);
  }

  formatSgfComment(raw, fallback) {
    const clean = (raw || '').trim();
    if (!clean) return fallback;
    if (/^(正解|正确|失败|错误|不对|RIGHT|WRONG|CORRECT|FAIL)[!！.。]*$/i.test(clean)) {
      return fallback;
    }
    return clean.replace(/^(正解|正确|失败|错误|RIGHT|WRONG)[：:\s!！]*/i, '').trim() || fallback;
  }

  handleSgfClick(clicked) {
    if (this.inDynamicBranch) {
      const quickTry = tryPlayStone(this.board, clicked, 'black');
      const forcedWins = findForcedCaptureMoves(this.board, this.remainingBlackMoves);
      if (
        (quickTry.valid && quickTry.captured.length > 0) ||
        forcedWins.some((m) => sameCoord(m, clicked))
      ) {
        this.handleDynamicCaptureMove(clicked);
      } else {
        this.handleWrongMove(clicked, forcedWins[0]);
      }
      return;
    }

    const children = (this.sgfNode && this.sgfNode.children) || [];
    const matched = children.find((ch) => ch.color === 'black' && sameCoord(ch.move, clicked));

    if (matched && matched.isCorrect) {
      this.handleSgfCorrectNode(matched);
      return;
    }
    if (matched && !matched.isCorrect) {
      this.handleSgfWrongNode(matched);
      return;
    }

    // 9路及以下宽容兜底（仅当棋盘不大于9路且未命中显式失败图时，允许客观必胜提子）
    if (this.level.boardSize <= 9 && this.level.target === 'capture' && !this.level.strictSgfOnly) {
      const quickTry = tryPlayStone(this.board, clicked, 'black');
      const forcedWins = findForcedCaptureMoves(this.board, 2);
      if (
        (quickTry.valid && quickTry.captured.length > 0) ||
        forcedWins.some((m) => sameCoord(m, clicked))
      ) {
        this.remainingBlackMoves = 2;
        this.handleDynamicCaptureMove(clicked);
        return;
      }
    }

    const rightChild = children.find((c) => c.color === 'black' && c.isCorrect);
    this.handleWrongMove(clicked, rightChild ? rightChild.move : null);
  }

  handleSgfCorrectNode(node) {
    const res = tryPlayStone(this.board, node.move, 'black');
    if (!res.valid) return;
    this.board = res.nextBoard;
    this.lastMove = node.move;
    this.hintCoord = null;
    this.inspectedGroupId = null;
    soundEngine.playStone();

    if (res.captured.length > 0) {
      this.captureBursts = res.captured;
      soundEngine.playCapture();
    }

    const whiteReplies = (node.children || []).filter((c) => c.color === 'white');
    const correctReplies = whiteReplies.filter((c) => c.isCorrect);
    const replyPool = correctReplies.length > 0 ? correctReplies : whiteReplies;
    const aiReplyNode =
      replyPool.length > 0 ? replyPool[Math.floor(Math.random() * replyPool.length)] : null;

    if (!aiReplyNode) {
      this.isAnimating = true;
      this.coachMood = res.captured.length > 0 ? 'shocked' : 'happy';
      this.coachText = this.formatSgfComment(
        node.comment,
        res.captured.length > 0 ? `哇！妙手吃掉 ${res.captured.length} 颗白棋！` : '太棒啦！找到妙手正解！'
      );
      this.coachBounce = true;
      this.coachAlert = false;
      if (res.captured.length === 0) soundEngine.playWin();
      this.render();
      soundEngine.speak(this.coachText);
      this.setTimer(() => {
        this.captureBursts = [];
        this.advanceLevel();
      }, 950);
      return;
    }

    this.isAnimating = true;
    this.coachMood = 'nervous';
    this.coachAlert = false;
    this.render();

    this.setTimer(() => {
      this.captureBursts = [];
      const aiRes = tryPlayStone(this.board, aiReplyNode.move, 'white');
      if (aiRes.valid) {
        this.board = aiRes.nextBoard;
        this.lastMove = aiReplyNode.move;
        soundEngine.playStone();
        if (aiRes.captured.length > 0) this.captureBursts = aiRes.captured;
      }
      this.sgfNode = aiReplyNode;

      const hasMoreBlack = (aiReplyNode.children || []).some((c) => c.color === 'black');
      if (!hasMoreBlack) {
        this.coachMood = 'crying';
        this.coachText = this.formatSgfComment(aiReplyNode.comment || node.comment, '无路可逃啦！妙手通关！');
        this.coachBounce = true;
        soundEngine.playWin();
        this.render();
        soundEngine.speak(this.coachText);
        this.setTimer(() => {
          this.captureBursts = [];
          this.advanceLevel();
        }, 950);
        return;
      }

      this.isAnimating = false;
      this.coachMood = 'thinking';
      this.coachText = this.formatSgfComment(aiReplyNode.comment || node.comment, '阿竹应对啦，继续下一手！');
      this.coachBounce = true;
      this.render();
      soundEngine.speak(this.coachText);
      if (this.captureBursts.length > 0) {
        this.setTimer(() => {
          this.captureBursts = [];
          this.render();
        }, 450);
      }
    }, 450);
  }

  handleSgfWrongNode(wrongNode) {
    this.markMistake();
    const res = tryPlayStone(this.board, wrongNode.move, 'black');
    if (!res.valid && res.reason === 'suicide') {
      soundEngine.playWrong();
      this.forbiddenCoord = wrongNode.move;
      this.coachMood = 'shocked';
      this.coachText = '这里 0 口气是禁入点，不能自杀哦！';
      this.coachAlert = true;
      this.coachBounce = true;
      this.render();
      soundEngine.speak(this.coachText);
      this.setTimer(() => {
        this.forbiddenCoord = null;
        const rightChild = ((this.sgfNode && this.sgfNode.children) || []).find((c) => c.color === 'black' && c.isCorrect);
        this.hintCoord = rightChild ? rightChild.move : null;
        this.render();
      }, 950);
      return;
    }

    const boardSnapshot = this.board;
    const prevLastMove = this.lastMove;
    this.isAnimating = true;
    this.board = res.nextBoard;
    this.lastMove = wrongNode.move;
    soundEngine.playStone();
    this.render();

    const aiCounterNode = (wrongNode.children || []).find((c) => c.color === 'white');
    const rawMsg = (aiCounterNode && aiCounterNode.comment) || wrongNode.comment || '';

    this.setTimer(() => {
      if (aiCounterNode) {
        const aiRes = tryPlayStone(this.board, aiCounterNode.move, 'white');
        if (aiRes.valid) {
          this.board = aiRes.nextBoard;
          this.lastMove = aiCounterNode.move;
          this.captureBursts = aiRes.captured;
        }
      }
      soundEngine.playWrong();
      this.coachMood = 'smug';
      this.coachText = this.formatSgfComment(rawMsg, '方向不对哦，阿竹趁机逃跑或反吃啦！');
      this.coachAlert = true;
      this.coachBounce = true;
      this.render();
      soundEngine.speak(this.coachText);

      this.setTimer(() => {
        this.board = boardSnapshot;
        this.lastMove = prevLastMove;
        this.captureBursts = [];
        const rightChild = ((this.sgfNode && this.sgfNode.children) || []).find((c) => c.color === 'black' && c.isCorrect);
        this.hintCoord = rightChild ? rightChild.move : null;
        this.isAnimating = false;
        this.coachMood = 'thinking';
        this.coachText = '没关系，跟着金色圆圈提示再试一次！';
        this.coachAlert = false;
        this.render();
      }, 1350);
    }, 360);
  }

  handleBossMove(move) {
    const res = tryPlayStone(this.board, move, 'black');
    if (!res.valid) {
      if (res.reason === 'suicide') {
        soundEngine.playWrong();
        this.forbiddenCoord = move;
        this.coachMood = 'shocked';
        this.coachText = '这里没气啦，换个有气的地方下吧！';
        this.coachAlert = true;
        this.render();
        soundEngine.speak(this.coachText);
        this.setTimer(() => {
          this.forbiddenCoord = null;
          this.render();
        }, 800);
      }
      return;
    }

    this.board = res.nextBoard;
    this.lastMove = move;
    this.blackCaptures += res.captured.length;
    soundEngine.playStone();
    if (res.captured.length > 0) {
      this.captureBursts = res.captured;
      soundEngine.playCapture();
      this.coachMood = 'crying';
      this.coachText = `哇呀！被你吃掉 ${res.captured.length} 颗子啦！`;
    } else {
      this.coachMood = 'thinking';
      this.coachText = '嗯……让阿竹想想下一步走哪里好～';
    }

    const goal = this.level.bossGoalCaptures || 2;
    if (this.blackCaptures >= goal) {
      this.isAnimating = true;
      this.coachMood = 'shocked';
      this.coachText = '你赢下 Boss 战啦！真是小小围棋高手！';
      this.render();
      this.setTimer(() => {
        this.captureBursts = [];
        this.advanceLevel();
      }, 1000);
      return;
    }

    this.isAnimating = true;
    this.render();

    this.setTimer(() => {
      this.captureBursts = [];
      const aiMove = chooseBossMove(this.board, 'white', this.level.unitId);
      if (!aiMove) {
        this.advanceLevel();
        return;
      }
      const aiRes = tryPlayStone(this.board, aiMove, 'white');
      if (aiRes.valid) {
        this.board = aiRes.nextBoard;
        this.lastMove = aiMove;
        this.whiteCaptures += aiRes.captured.length;
        soundEngine.playStone();
        if (aiRes.captured.length > 0) {
          this.captureBursts = aiRes.captured;
          soundEngine.playAtari();
          this.coachMood = 'smug';
          this.coachText = `嘿嘿！阿竹也吃到 ${aiRes.captured.length} 颗黑子咯！`;
        } else {
          this.coachMood = 'happy';
          this.coachText = '轮到你啦！注意看有没有能吃掉的白棋！';
        }
      }
      this.isAnimating = false;

      if (this.whiteCaptures >= goal) {
        this.bossDefeated = true;
        this.coachMood = 'smug';
        this.coachText = `阿竹先吃到 ${goal} 颗子啦，点下方按钮再来一局！`;
        soundEngine.playWrong();
      }
      this.render();
      this.setTimer(() => {
        if (this.captureBursts.length > 0) {
          this.captureBursts = [];
          this.render();
        }
      }, 500);
    }, 480);
  }

  renderCelebration() {
    const s = this.winSummary;
    const confettiColors = ['#58CC02', '#FFC800', '#1CB0F6', '#FF4B4B', '#CE82FF'];
    const confetti = Array.from({ length: 14 }, (_, i) => {
      const left = (i * 7 + 5) % 95;
      const delay = (i * 0.14).toFixed(2);
      const color = confettiColors[i % confettiColors.length];
      return `<span class="confetti-piece" style="left:${left}%;background:${color};animation-delay:${delay}s;"></span>`;
    }).join('');

    return `
      <div class="modal-backdrop">
        <div class="modal-card celebration-box">
          ${confetti}
          <div style="font-size:52px;margin-top:8px;">🎉</div>
          <h2 style="margin:6px 0 4px;font-size:24px;font-weight:900;">闯关成功！</h2>
          <p style="margin:0;color:var(--ink-muted);font-size:14px;font-weight:700;">${this.sessionMeta.title}</p>
          <div class="stars-row">
            ${[1, 2, 3].map((i) => `<span>${i <= s.stars ? '⭐' : '☆'}</span>`).join('')}
          </div>
          <div class="reward-chips">
            ${this.sessionMeta.isTvUnlock ? `<span class="reward-chip">⏱️ +${this.sessionMeta.bonusMin || 30} 分钟使用时间</span>` : ''}
            <span class="reward-chip">🎋 +${s.coinsEarned} 翠竹币</span>
            <span class="reward-chip">🔥 连胜 ${s.streakDays} 天</span>
            ${s.badge ? `<span class="reward-chip">${s.badge.icon} 解锁徽章「${s.badge.name}」</span>` : ''}
          </div>
          <div style="display:flex;gap:10px;justify-content:center;">
            <button class="btn-3d btn-green" style="flex:1;" data-action="exit-win">${
              this.sessionMeta.isTvUnlock ? '立即返回应用' : '回到地图继续'
            }</button>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    const st = store.getState();
    const progressPct = Math.round(((this.queueIndex + (this.finishedSession ? 1 : 0)) / this.queue.length) * 100);
    const goal = this.level.bossGoalCaptures || 2;
    const scaffoldLabel =
      this.level.boardSize > 7
        ? `📐 ${this.level.boardSize}×${this.level.boardSize} 局部 · 轻触棋子可探气`
        : this.level.scaffoldMode === 'all_liberties'
        ? '🫧 气点提示：全部显示'
        : this.level.scaffoldMode === 'atari_only'
        ? '🔥 气点提示：危急发抖提醒'
        : '👀 自由视野：轻触棋子可探气';

    const tagText = this.isRetryItem
      ? '🔄 错题巩固 · 换个方向再试一次'
      : `🐼 阿竹教练 · 第 ${this.queueIndex + 1}/${this.queue.length} 题`;

    this.root.innerHTML = `
      <div class="lesson-view">
        <div class="lesson-sidebar">
          <div class="lesson-header">
            <button class="icon-pill" data-action="exit-lesson" aria-label="退出">${this.sessionMeta.isTvUnlock ? '✕' : '✕'}</button>
            ${this.onBackToMap ? '<button class="icon-pill" data-action="go-map" title="返回关卡列表">📋 选关</button>' : ''}
            <div class="progress-track">
              <div class="progress-fill ${this.isRetryItem ? 'review-mode' : ''}" style="width:${Math.max(8, progressPct)}%"></div>
            </div>
            <button class="icon-pill" data-action="toggle-tts" title="语音开关">${st.ttsEnabled ? '🗣️' : '🔇'}</button>
          </div>

          ${renderCoachBox({
            mood: this.coachMood,
            text: this.coachText,
            tagText,
            isAlert: this.coachAlert,
            bounce: this.coachBounce,
          })}

          ${
            this.level.type === 'boss_battle'
              ? `
            <div class="boss-scoreboard">
              <div class="score-pill">⚫ 你吃掉：<strong>${this.blackCaptures}/${goal}</strong></div>
              <button class="icon-pill" data-action="restart-boss">🔄 重来</button>
              <div class="score-pill">⚪ 阿竹：<strong>${this.whiteCaptures}/${goal}</strong></div>
            </div>
          `
              : ''
          }

          <div class="lesson-footer">
            <span class="scaffold-pill">${scaffoldLabel}</span>
            ${
              this.bossDefeated
                ? `<button class="btn-3d btn-gold" data-action="restart-boss">再战一局</button>`
                : this.level.type === 'find_liberty'
                ? `<span class="scaffold-pill">已找到 ${this.foundKeys.size}/${this.targetLibertyKeys.size}</span>`
                : this.level.type === 'find_atari'
                ? `<span class="scaffold-pill">已找到 ${this.foundKeys.size}/${this.targetStoneKeys.size}</span>`
                : ''
            }
          </div>

          <div class="tv-remote-hint">🎮 遥控器：方向键移动光标 · 确认键落子 · 返回键退出</div>
        </div>

        <div class="board-stage">
          <div class="board-card theme-${st.activeBoardTheme}">
            ${renderBoardSVG({
              board: this.board,
              viewport: this.level.viewport || null,
              theme: st.activeBoardTheme,
              skin: st.activeStoneSkin,
              scaffoldMode: this.level.scaffoldMode,
              levelType: this.level.type,
              foundKeys: this.foundKeys,
              targetLibertyKeys: this.targetLibertyKeys,
              inspectedGroupId: this.inspectedGroupId,
              hintCoord: this.hintCoord,
              forbiddenCoord: this.forbiddenCoord,
              lastMove: this.lastMove,
              captureBursts: this.captureBursts,
              cursorCoord: this.cursorCoord,
            })}
          </div>
        </div>
      </div>
      ${this.finishedSession ? this.renderCelebration() : ''}
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.root.querySelectorAll('[data-action="exit-lesson"]').forEach((el) => {
      el.addEventListener('click', () => {
        this.destroy();
        this.onExit();
      });
    });
    this.root.querySelectorAll('[data-action="go-map"]').forEach((el) => {
      el.addEventListener('click', () => {
        this.destroy();
        if (this.onBackToMap) this.onBackToMap();
        else this.onExit();
      });
    });
    this.root.querySelectorAll('[data-action="exit-win"]').forEach((el) => {
      el.addEventListener('click', () => {
        this.destroy();
        if (this.sessionMeta.isTvUnlock && this.onWinExit) {
          this.onWinExit();
        } else {
          this.onExit();
        }
      });
    });

    this.root.querySelectorAll('[data-action="replay-tts"]').forEach((el) => {
      el.addEventListener('click', () => soundEngine.speak(this.coachText));
    });

    this.root.querySelectorAll('[data-action="toggle-tts"]').forEach((el) => {
      el.addEventListener('click', () => {
        store.toggleTts();
        this.render();
      });
    });

    this.root.querySelectorAll('[data-action="restart-boss"]').forEach((el) => {
      el.addEventListener('click', () => this.loadCurrentLevel());
    });

    const svg = this.root.querySelector('.board-svg');
    if (svg) {
      svg.addEventListener('click', (e) => {
        const target = e.target.closest('[data-x][data-y]');
        if (!target) return;
        const x = Number(target.getAttribute('data-x'));
        const y = Number(target.getAttribute('data-y'));
        this.cursorCoord = [x, y];
        this.handleCellClick(x, y);
      });
    }
  }

  handleKeyDown(e) {
    if (!this.level) return;
    if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      this.destroy();
      this.onExit();
      return;
    }
    if (this.finishedSession) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.destroy();
        this.onExit();
      }
      return;
    }
    const vp = this.level.viewport || {
      x0: 0,
      y0: 0,
      x1: this.level.boardSize - 1,
      y1: this.level.boardSize - 1,
    };
    const [cx, cy] = this.cursorCoord || [Math.floor((vp.x0 + vp.x1) / 2), Math.floor((vp.y0 + vp.y1) / 2)];
    let nx = cx;
    let ny = cy;
    if (e.key === 'ArrowUp') ny = Math.max(vp.y0, cy - 1);
    else if (e.key === 'ArrowDown') ny = Math.min(vp.y1, cy + 1);
    else if (e.key === 'ArrowLeft') nx = Math.max(vp.x0, cx - 1);
    else if (e.key === 'ArrowRight') nx = Math.min(vp.x1, cx + 1);
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.bossDefeated) {
        this.loadCurrentLevel();
      } else {
        this.handleCellClick(cx, cy);
      }
      return;
    } else {
      return;
    }
    e.preventDefault();
    if (nx !== cx || ny !== cy || !this.cursorCoord) {
      this.cursorCoord = [nx, ny];
      this.render();
    }
  }
}
