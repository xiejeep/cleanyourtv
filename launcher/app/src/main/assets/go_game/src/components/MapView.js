import { UNITS, NODES } from '../data/catalog.js';
import { ALL_LEVELS, getLevelsByNode } from '../data/allLevels.js';
import { store } from '../state/store.js';
import { closeTvUnlock, getRewardedSessionIds, getTvBonusMinutes, isTvUnlockMode } from '../state/tvBridge.js';
import { soundEngine } from '../engine/audio.js';
import { renderCollectionModal, bindCollectionEvents } from './CollectionModal.js';
import { renderSgfImportModal, bindSgfModalEvents } from './SgfImportModal.js';

const S_OFFSETS = [0, -46, 0, 46];

export class MapView {
  constructor({ root, onStartSession }) {
    this.root = root;
    this.onStartSession = onStartSession;
    this.expandedNodeId = '1.1';
    this.showLevelGridFor = null;
    this.showCollection = false;
    this.collectionTab = 'skins';
    this.showSgfModal = false;
    this.sgfState = {
      sgfTab: 'import',
      sgfDraftName: '',
      sgfDraftText: '',
      sgfHint: '',
    };
    this.showParentModal = false;
    this.parentMath = { a: 7, b: 5 };
    this.parentError = '';
    this.onKeyDown = (e) => {
      if ((e.key === 'Escape' || e.key === 'Backspace') && isTvUnlockMode()
          && !this.showCollection && !this.showSgfModal && !this.showParentModal) {
        e.preventDefault();
        closeTvUnlock();
      }
    };
    window.addEventListener('keydown', this.onKeyDown);

    this.render();
  }

  destroy() {
    if (this.onKeyDown) {
      window.removeEventListener('keydown', this.onKeyDown);
      this.onKeyDown = null;
    }
  }

  isNodeUnlocked(nodeIndex) {
    const st = store.getState();
    const node = NODES[nodeIndex];
    if (st.parentPreviewMode || nodeIndex === 0 || (node && (node.id === '3.1' || node.id === '1.1'))) return true;
    const prevNode = NODES[nodeIndex - 1];
    const lastSession = prevNode.sessions[prevNode.sessions.length - 1];
    return Boolean(st.completedSessions[lastSession.id]);
  }

  isNodeCompleted(node) {
    const st = store.getState();
    return node.sessions.every((s) => Boolean(st.completedSessions[s.id]));
  }

  renderNodeSheet(node, nodeLevels) {
    const st = store.getState();
    const isGridOpen = this.showLevelGridFor === node.id;

    const sessionsHtml = node.sessions
      .map((sess, sIdx) => {
        const prevSess = sIdx > 0 ? node.sessions[sIdx - 1] : null;
        const sessUnlocked =
          st.parentPreviewMode || sIdx === 0 || Boolean(prevSess && st.completedSessions[prevSess.id]);
        const doneInfo = st.completedSessions[sess.id];
        const starsText = doneInfo ? '⭐'.repeat(doneInfo.stars) : '';

        return `
          <div class="session-row ${sessUnlocked ? '' : 'locked-row'}">
            <div>
              <div style="font-size:13px;font-weight:900;">${sess.title}</div>
              <div style="font-size:11px;color:var(--ink-muted);font-weight:700;">
                共 ${sess.levelRange[1] - sess.levelRange[0]} 关 ${starsText ? `· ${starsText}` : ''}
              </div>
            </div>
            <button class="btn-3d ${sessUnlocked ? 'btn-green' : 'btn-ghost'}"
              style="padding:7px 12px;font-size:13px;"
              ${sessUnlocked ? '' : 'disabled'}
              data-start-session="${sess.id}" data-node-id="${node.id}">
              ${doneInfo ? '再刷一遍' : sessUnlocked ? '开始' : '🔒'}
            </button>
          </div>
        `;
      })
      .join('');

    const chipsHtml = isGridOpen
      ? `
        <div class="level-chip-grid">
          ${nodeLevels
            .map((lvl, idx) => {
              const done = st.completedLevelIds.includes(lvl.id);
              const isBoss = lvl.type === 'boss_battle';
              const canJump = st.parentPreviewMode || done || idx === 0;
              return `
                <button class="level-chip ${done ? 'done' : ''} ${isBoss ? 'boss' : ''}"
                  ${canJump ? '' : 'disabled'}
                  data-jump-level="${lvl.id}" data-node-id="${node.id}">
                  ${isBoss ? '👑Boss' : `第${idx + 1}关`}
                </button>
              `;
            })
            .join('')}
        </div>
      `
      : '';

    return `
      <div class="node-sheet">
        <div class="node-sheet-title">
          <span>${node.icon} ${node.id} ${node.title}</span>
          <button class="icon-pill" style="padding:3px 9px;font-size:12px;" data-close-sheet="true">收起</button>
        </div>
        <div class="node-sheet-desc">${node.shortDesc}</div>
        <div class="session-list">${sessionsHtml}</div>
        <button class="level-grid-toggle" data-toggle-grid="${node.id}">
          ${isGridOpen ? '▲ 收起单关直达列表' : `▼ 单关直达 / 跳关（共 ${nodeLevels.length} 关）`}
        </button>
        ${chipsHtml}
      </div>
    `;
  }

  renderParentModal() {
    return `
      <div class="modal-backdrop" data-close-parent="bg">
        <div class="modal-card">
          <div class="modal-header">
            <h3>👨‍👩‍👧 家长 / 教学预览验证</h3>
            <button class="icon-pill" data-close-parent="btn">✕</button>
          </div>
          <p style="margin:0;font-size:14px;color:var(--ink-muted);line-height:1.5;">
            为了防止小朋友误触直接跳关，请家长回答下面的小算术题来开启<strong>全关卡自由预览模式</strong>：
          </p>
          <div style="text-align:center;font-size:26px;font-weight:900;margin-top:14px;color:var(--blue-shadow);">
            ${this.parentMath.a} + ${this.parentMath.b} = ?
          </div>
          <input class="parent-math-input" type="number" inputmode="numeric" id="parentMathInput" placeholder="输入答案" autofocus />
          ${
            this.parentError
              ? `<div style="color:var(--red-alert);font-size:13px;font-weight:800;text-align:center;margin-bottom:10px;">${this.parentError}</div>`
              : ''
          }
          <button class="btn-3d btn-blue" style="width:100%;" data-confirm-parent="true">验证并解锁全部关卡</button>
        </div>
      </div>
    `;
  }

  render() {
    const st = store.getState();

    const unitsHtml = UNITS.map((unit) => {
      const unitNodes = NODES.filter((n) => n.unitId === unit.id);
      const nodesHtml = unitNodes
        .map((node, localIdx) => {
          const globalIdx = NODES.findIndex((n) => n.id === node.id);
          const unlocked = this.isNodeUnlocked(globalIdx);
          const completed = this.isNodeCompleted(node);
          const nodeLevels = getLevelsByNode(node.id);
          const doneLevelsCount = nodeLevels.filter((l) => st.completedLevelIds.includes(l.id)).length;
          const offset = S_OFFSETS[localIdx % S_OFFSETS.length];
          const doneSessions = node.sessions.filter((s) => Boolean(st.completedSessions[s.id])).length;
          const ratio = doneSessions / node.sessions.length;
          const dashLen = 282.7;
          const dashOffset = dashLen * (1 - ratio);

          const btnClass = completed
            ? 'completed'
            : unlocked
            ? `unlocked-${unit.id}`
            : 'locked';

          return `
            <div class="node-wrapper">
              <div style="transform:translateX(${offset}px);display:flex;flex-direction:column;align-items:center;">
                <button class="node-circle-btn ${btnClass}" data-node-btn="${node.id}" ${unlocked ? '' : 'disabled'}>
                  <svg class="node-ring" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="6"/>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#FFC800" stroke-width="6"
                      stroke-linecap="round" stroke-dasharray="${dashLen}" stroke-dashoffset="${dashOffset}"
                      transform="rotate(-90 50 50)"/>
                  </svg>
                  <span>${unlocked ? node.icon : '🔒'}</span>
                </button>
                <div class="node-label">${node.id} ${node.title}</div>
                <div class="node-sub">${doneLevelsCount}/${nodeLevels.length} 关 ${node.isBossNode ? '· 含 Boss战' : ''}</div>
              </div>
              ${unlocked && this.expandedNodeId === node.id ? this.renderNodeSheet(node, nodeLevels) : ''}
            </div>
          `;
        })
        .join('');

      return `
        <section>
          <div class="unit-banner unit-${unit.id}">
            <div>
              <h2>${unit.title}</h2>
              <p>${unit.subtitle}</p>
            </div>
            <span style="font-size:30px;">${unit.id === 1 ? '🐼' : unit.id === 2 ? '🐯' : '⚡'}</span>
          </div>
          <div class="path-nodes">${nodesHtml}</div>
        </section>
      `;
    }).join('');

    this.root.innerHTML = `
      <header class="top-bar">
        <div class="top-stats">
          ${
            isTvUnlockMode()
              ? '<button class="icon-pill active-green" data-action="tv-exit" title="返回电视桌面">← 返回电视</button>'
              : ''
          }
          <span class="icon-pill" title="每日连续打卡天数">🔥 ${st.streakDays} 天</span>
          <button class="icon-pill active-gold" data-action="open-collection" title="打开阿竹小仓库">
            🎋 ${st.bambooCoins} · 仓库
          </button>
        </div>
        <div class="top-stats">
          <button class="icon-pill" data-action="open-sgf" title="导入 SGF 题库">📥 SGF</button>
          <button class="icon-pill" data-action="toggle-sound" title="音效开关">${st.soundEnabled ? '🔊' : '🔇'}</button>
          <button class="icon-pill ${st.parentPreviewMode ? 'active-gold' : ''}" data-action="toggle-parent">
            ${st.parentPreviewMode ? '🔓 预览中' : '👨‍👩‍👧 家长预览'}
          </button>
        </div>
      </header>
      ${
        st.parentPreviewMode
          ? `
        <div class="preview-banner">
          <span>🔓 家长/教学预览模式：全 ${NODES.length} 节点 ${ALL_LEVELS.length} 关已自由解锁</span>
          <button class="icon-pill" style="padding:2px 8px;font-size:11px;" data-action="turn-off-parent">关闭</button>
        </div>
      `
          : ''
      }
      <main class="map-scroll">
        ${unitsHtml}
      </main>
      ${
        this.showCollection
          ? renderCollectionModal({
              activeTab: this.collectionTab,
            })
          : ''
      }
      ${
        this.showSgfModal
          ? renderSgfImportModal({
              activeTab: this.sgfState.sgfTab,
              draftName: this.sgfState.sgfDraftName,
              draftText: this.sgfState.sgfDraftText,
              statusHint: this.sgfState.sgfHint,
            })
          : ''
      }
      ${this.showParentModal ? this.renderParentModal() : ''}
    `;

    this.bindEvents();
  }

  bindEvents() {
    const on = (sel, fn) => {
      const el = this.root.querySelector(sel);
      if (el) el.addEventListener('click', fn);
    };

    on('[data-action="tv-exit"]', () => {
      closeTvUnlock();
    });

    on('[data-action="open-collection"]', () => {
      soundEngine.playTap();
      this.showCollection = true;
      this.render();
    });

    on('[data-action="open-sgf"]', () => {
      soundEngine.playTap();
      this.showSgfModal = true;
      this.render();
    });

    on('[data-action="toggle-sound"]', () => {
      store.toggleSound();
      this.render();
    });

    on('[data-action="toggle-parent"]', () => {
      const st = store.getState();
      if (st.parentPreviewMode) {
        store.setParentPreviewMode(false);
        this.render();
      } else {
        this.parentMath = {
          a: 4 + Math.floor(Math.random() * 6),
          b: 3 + Math.floor(Math.random() * 7),
        };
        this.parentError = '';
        this.showParentModal = true;
        this.render();
      }
    });

    on('[data-action="turn-off-parent"]', () => {
      store.setParentPreviewMode(false);
      this.render();
    });

    this.root.querySelectorAll('[data-node-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        soundEngine.playTap();
        const id = btn.getAttribute('data-node-btn');
        this.expandedNodeId = this.expandedNodeId === id ? null : id;
        this.render();
      });
    });

    on('[data-close-sheet]', () => {
      this.expandedNodeId = null;
      this.render();
    });

    this.root.querySelectorAll('[data-toggle-grid]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-toggle-grid');
        this.showLevelGridFor = this.showLevelGridFor === id ? null : id;
        this.render();
      });
    });

    this.root.querySelectorAll('[data-start-session]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sessId = btn.getAttribute('data-start-session');
        const nodeId = btn.getAttribute('data-node-id');
        const node = NODES.find((n) => n.id === nodeId);
        const sess = node.sessions.find((s) => s.id === sessId);
        const nodeLevels = getLevelsByNode(nodeId);
        const slice = nodeLevels.slice(sess.levelRange[0], sess.levelRange[1]);
        const isLastSession = node.sessions[node.sessions.length - 1].id === sess.id;
        const tvMode = isTvUnlockMode();
        const rewardedSet = tvMode ? getRewardedSessionIds() : null;
        const canGrantTvReward = tvMode && !rewardedSet.has(String(sess.id));
        const bonusMin = tvMode ? getTvBonusMinutes() : 0;
        soundEngine.playTap();
        this.destroy();
        this.onStartSession({
          levels: slice,
          sessionMeta: {
            sessionId: sess.id,
            title: canGrantTvReward
              ? `${node.id} ${node.title} · ${sess.title} · 通关延 ${bonusMin} 分钟`
              : `${node.id} ${node.title} · ${sess.title}`,
            nodeId,
            badgeId: isLastSession ? node.badgeId : null,
            isSingleTest: false,
            isTvUnlock: canGrantTvReward,
            bonusMin,
          },
        });
      });
    });

    this.root.querySelectorAll('[data-jump-level]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lvlId = btn.getAttribute('data-jump-level');
        const nodeId = btn.getAttribute('data-node-id');
        const node = NODES.find((n) => n.id === nodeId);
        const nodeLevels = getLevelsByNode(nodeId);
        const target = nodeLevels.find((l) => l.id === lvlId);
        if (!target) return;
        soundEngine.playTap();
        this.destroy();
        this.onStartSession({
          levels: [target],
          sessionMeta: {
            sessionId: null,
            title: `${node.id} ${node.title} · 单关直达`,
            nodeId,
            badgeId: null,
            isSingleTest: true,
          },
        });
      });
    });

    if (this.showCollection) {
      bindCollectionEvents(this.root, {
        onTabChange: (tab) => {
          this.collectionTab = tab;
          this.render();
        },
        onClose: () => {
          this.showCollection = false;
          this.render();
        },
        onRefresh: () => this.render(),
      });
    }

    if (this.showSgfModal) {
      bindSgfModalEvents(this.root, {
        stateRef: this.sgfState,
        onRender: () => this.render(),
        onClose: () => {
          this.showSgfModal = false;
          this.render();
        },
        onStartLevels: (payload) => this.onStartSession(payload),
      });
    }

    if (this.showParentModal) {
      this.root.querySelectorAll('[data-close-parent]').forEach((el) => {
        el.addEventListener('click', (e) => {
          if (el.getAttribute('data-close-parent') === 'bg' && e.target !== el) return;
          this.showParentModal = false;
          this.render();
        });
      });
      const input = this.root.querySelector('#parentMathInput');
      const submitParent = () => {
        const val = Number((input ? input.value : '').trim());
        if (val === this.parentMath.a + this.parentMath.b) {
          soundEngine.playUnlock();
          store.setParentPreviewMode(true);
          this.showParentModal = false;
          this.render();
        } else {
          soundEngine.playWrong();
          this.parentError = '答案好像不对哦，请再算一下～';
          this.render();
        }
      };
      const confirmParentBtn = this.root.querySelector('[data-confirm-parent]');
      if (confirmParentBtn) confirmParentBtn.addEventListener('click', submitParent);
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') submitParent();
        });
      }
    }
  }
}
