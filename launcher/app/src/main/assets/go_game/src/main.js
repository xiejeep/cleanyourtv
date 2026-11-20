import { MapView } from './components/MapView.js';
import { LessonRunner } from './components/LessonRunner.js';
import { getLevelsByNode } from './data/allLevels.js';
import { NODES, UNITS } from './data/catalog.js';
import { closeTvUnlock, getRewardedSessionIds, getTvBonusMinutes, isTvUnlockMode } from './state/tvBridge.js';

const root = document.getElementById('app');
let activeRunner = null;

function buildAllSessions() {
  const sessions = [];
  const orderedNodes = [];
  for (const unit of UNITS) {
    for (const node of NODES) {
      if (node.unitId === unit.id) orderedNodes.push(node);
    }
  }
  for (const node of orderedNodes) {
    const nodeLevels = getLevelsByNode(node.id);
    const total = node.sessions.length;
    node.sessions.forEach((sess, idx) => {
      const slice = nodeLevels.slice(sess.levelRange[0], sess.levelRange[1]);
      if (slice.length === 0) return;
      sessions.push({
        id: sess.id,
        title: `${node.title} · ${sess.title}`,
        nodeId: node.id,
        badgeId: idx === total - 1 ? node.badgeId : null,
        levels: slice,
      });
    });
  }
  return sessions;
}

function showMap() {
  if (activeRunner) {
    activeRunner.destroy();
    activeRunner = null;
  }
  new MapView({
    root,
    onStartSession: ({ levels, sessionMeta }) => {
      activeRunner = new LessonRunner({
        root,
        levels,
        sessionMeta,
        onExit: showMap,
        onWinExit: () => {
          if (!closeTvUnlock()) showMap();
        },
      });
    },
  });
}

function renderAllCleared(totalSessions) {
  root.innerHTML = `
    <div class="modal-backdrop" style="position:static;min-height:100vh;background:transparent;">
      <div class="modal-card celebration-box" style="max-width:460px;">
        <div style="font-size:56px;margin-top:8px;">🏆</div>
        <h2 style="margin:8px 0 6px;font-size:24px;font-weight:900;">全部围棋小节已通关！</h2>
        <p style="margin:0 0 16px;color:var(--ink-muted);font-size:15px;line-height:1.6;font-weight:700;">
          当前所有 ${totalSessions} 个小节都已用来解锁过时间啦。<br/>
          如需继续使用，请输入家长密码；服务器更新新关卡后将自动恢复闯关解锁。
        </p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button class="btn-3d btn-green" style="flex:1;" id="tv-unlock-close-btn">返回电视桌面</button>
        </div>
      </div>
    </div>
  `;
  const btn = document.getElementById('tv-unlock-close-btn');
  if (btn) {
    btn.focus();
    btn.addEventListener('click', () => {
      if (!closeTvUnlock()) showMap();
    });
  }
}

function showTvUnlock() {
  if (activeRunner) {
    activeRunner.destroy();
    activeRunner = null;
  }
  const allSessions = buildAllSessions();
  const rewarded = getRewardedSessionIds();
  const remaining = allSessions.filter((s) => !rewarded.has(String(s.id)));
  if (remaining.length === 0) {
    renderAllCleared(allSessions.length);
    return;
  }
  const nextSession = remaining[0];
  const bonusMin = getTvBonusMinutes();
  activeRunner = new LessonRunner({
    root,
    levels: nextSession.levels,
    sessionMeta: {
      sessionId: nextSession.id,
      title: `${nextSession.title} · 通关延 ${bonusMin} 分钟（余 ${remaining.length}/${allSessions.length} 节）`,
      nodeId: nextSession.nodeId,
      badgeId: nextSession.badgeId,
      isTvUnlock: true,
      bonusMin,
    },
    onExit: () => {
      if (!closeTvUnlock()) {
        showMap();
      }
    },
    onBackToMap: showMap,
    onWinExit: () => {
      if (!closeTvUnlock()) {
        showTvUnlock();
      }
    },
  });
}

if (isTvUnlockMode()) {
  showTvUnlock();
} else {
  showMap();
}
