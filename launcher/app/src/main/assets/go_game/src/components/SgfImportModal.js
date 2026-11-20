import { parseSgfLevels } from '../engine/sgfParser.js';
import { SAMPLE_101_SGF } from '../data/sgf101Pack.js';
import { store } from '../state/store.js';
import { soundEngine } from '../engine/audio.js';

function inspectSgfDraft(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return { ok: false, message: '请上传 .sgf 文件、粘贴 SGF 文本，或点击下方「填入 101 示例合集」' };
  }
  try {
    const levels = parseSgfLevels(trimmed, { unitId: 3, nodeId: 'custom', scaffoldMode: 'tap_inspect' });
    const sizes = Array.from(new Set(levels.map((l) => `${l.boardSize}路`))).join(' / ');
    let branches = 0;
    const countNodes = (n) => {
      if (!n) return;
      if (n.children && n.children.length > 1) branches += n.children.length;
      for (const c of n.children || []) countNodes(c);
    };
    levels.forEach((l) => countNodes(l.sgfTree));
    return {
      ok: true,
      levels,
      message: `✅ 成功解析 ${levels.length} 道题目（${sizes}${branches > 0 ? ` · 含 ${branches} 条分支变化` : ''}）`,
    };
  } catch (err) {
    return { ok: false, message: `❌ ${err.message || 'SGF 解析失败'}` };
  }
}

function escapeAttr(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderSgfImportModal({ activeTab = 'import', draftName = '', draftText = '', statusHint = '' }) {
  const st = store.getState();
  const preview = inspectSgfDraft(draftText);

  let bodyHtml = '';
  if (activeTab === 'import') {
    bodyHtml = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <label class="btn-3d btn-ghost" style="padding:7px 12px;font-size:13px;cursor:pointer;">
            📂 选择本地 .sgf 文件
            <input type="file" accept=".sgf,.txt" id="sgfFileInput" style="display:none;" />
          </label>
          <button class="btn-3d btn-gold" style="padding:7px 12px;font-size:13px;" data-action="sgf-fill-sample">
            ✨ 填入 101 示例合集
          </button>
        </div>
        <input type="text" class="sgf-name-input" id="sgfPackName" value="${escapeAttr(draftName)}" placeholder="题本名称（例如：101 吃子练习）" />
        <textarea class="sgf-textarea" id="sgfTextInput" placeholder="在此粘贴标准 SGF 棋谱，支持单题或多题合集 (;SZ[19]AB[...]AW[...](;B[...]C[正解])(;B[...];W[...]C[失败]))">${escapeAttr(draftText)}</textarea>
        <div id="sgfPreviewBox" class="sgf-preview-pill ${preview.ok ? 'ok' : 'err'}">${preview.message}</div>
        ${statusHint ? `<div style="font-size:12px;font-weight:800;color:var(--green-shadow);">${statusHint}</div>` : ''}
        <button class="btn-3d btn-purple" style="width:100%;" id="sgfSavePlayBtn" data-action="sgf-save-play" ${preview.ok ? '' : 'disabled'}>
          🚀 保存并立即闯关
        </button>
      </div>
    `;
  } else if (activeTab === 'packs') {
    const packs = st.customSgfPacks || [];
    bodyHtml =
      packs.length === 0
        ? `
        <div style="text-align:center;padding:24px 12px;color:var(--ink-muted);">
          <div style="font-size:38px;margin-bottom:8px;">📭</div>
          <div style="font-weight:800;font-size:14px;">还没有导入自定义题本</div>
          <div style="font-size:12px;margin-top:4px;">切换到「导入 SGF」即可一键导入并保存！</div>
        </div>
      `
        : `
        <div class="item-grid">
          ${packs
            .map(
              (p) => `
            <div class="shop-card">
              <div>
                <div style="font-weight:900;font-size:14px;">📘 ${escapeAttr(p.name)}</div>
                <div style="font-size:12px;color:var(--ink-muted);">共 ${p.count} 题 · ${p.createdAt || ''}</div>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0;">
                <button class="btn-3d btn-green" style="padding:7px 12px;font-size:12px;" data-play-pack="${p.id}">闯关</button>
                <button class="icon-pill" style="padding:5px 9px;font-size:12px;" data-copy-pack="${p.id}" title="复制 SGF">📋</button>
                <button class="icon-pill" style="padding:5px 9px;font-size:12px;" data-del-pack="${p.id}" title="删除">🗑️</button>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;
  } else {
    bodyHtml = `
      <div style="font-size:13px;line-height:1.65;color:var(--ink-dark);display:flex;flex-direction:column;gap:8px;">
        <div><strong>1. 兼容主流题库格式：</strong>完美支持 101 围棋网、Sabaki、OGS、GitHub 开源题库的标准 SGF 棋谱及多题合集 <code>(...)(...)</code>，支持压缩矩形 <code>AB[aa:ac]</code>。</div>
        <div><strong>2. 白先自动转黑先：</strong>遇到 <code>PL[W]</code> 白先题目会自动互换黑白棋色，保证小朋友始终执黑、小熊猫阿竹执白陪练。</div>
        <div><strong>3. 正解与失败图演示：</strong>自动识别 <code>正解/正确/RIGHT/TE</code> 与 <code>失败/错误/WRONG/BM</code> 分支，走错时直接播放 SGF 自带失败变化图！</div>
        <div><strong>4. 19 路自动放大裁剪：</strong>19×19 或 13×13 棋盘会自动裁剪局部角落，带真实粗边线与延伸虚线尾，手机竖屏也能轻松点中！</div>
      </div>
    `;
  }

  return `
    <div class="modal-backdrop" data-sgf-bg="true">
      <div class="modal-card">
        <div class="modal-header">
          <h3>📥 SGF 题库工坊</h3>
          <button class="icon-pill" data-close-sgf="true">✕</button>
        </div>
        <div class="tab-row">
          <button class="tab-btn ${activeTab === 'import' ? 'active' : ''}" data-sgf-tab="import">导入 SGF</button>
          <button class="tab-btn ${activeTab === 'packs' ? 'active' : ''}" data-sgf-tab="packs">我的题本 (${(st.customSgfPacks || []).length})</button>
          <button class="tab-btn ${activeTab === 'help' ? 'active' : ''}" data-sgf-tab="help">格式说明</button>
        </div>
        ${bodyHtml}
      </div>
    </div>
  `;
}

export function bindSgfModalEvents(root, { stateRef, onRender, onClose, onStartLevels }) {
  root.querySelectorAll('[data-close-sgf="true"]').forEach((el) => el.addEventListener('click', onClose));
  const bg = root.querySelector('[data-sgf-bg="true"]');
  if (bg) {
    bg.addEventListener('click', (e) => {
      if (e.target === bg) onClose();
    });
  }

  root.querySelectorAll('[data-sgf-tab]').forEach((el) => {
    el.addEventListener('click', () => {
      stateRef.sgfTab = el.getAttribute('data-sgf-tab');
      stateRef.sgfHint = '';
      onRender();
    });
  });

  const nameInput = root.querySelector('#sgfPackName');
  const textArea = root.querySelector('#sgfTextInput');
  const previewBox = root.querySelector('#sgfPreviewBox');
  const savePlayBtn = root.querySelector('#sgfSavePlayBtn');

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      stateRef.sgfDraftName = nameInput.value;
    });
  }

  if (textArea) {
    textArea.addEventListener('input', () => {
      stateRef.sgfDraftText = textArea.value;
      const res = inspectSgfDraft(textArea.value);
      if (previewBox) {
        previewBox.textContent = res.message;
        previewBox.className = `sgf-preview-pill ${res.ok ? 'ok' : 'err'}`;
      }
      if (savePlayBtn) savePlayBtn.disabled = !res.ok;
    });
  }

  const sgfFileInput = root.querySelector('#sgfFileInput');
  if (sgfFileInput) {
    sgfFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        stateRef.sgfDraftText = String(reader.result || '');
        if (!stateRef.sgfDraftName) {
          stateRef.sgfDraftName = file.name.replace(/\.sgf$/i, '');
        }
        onRender();
      };
      reader.readAsText(file, 'utf-8');
    });
  }

  const fillSampleBtn = root.querySelector('[data-action="sgf-fill-sample"]');
  if (fillSampleBtn) {
    fillSampleBtn.addEventListener('click', () => {
      soundEngine.playTap();
      stateRef.sgfDraftName = '101 经典四招试玩包';
      stateRef.sgfDraftText = SAMPLE_101_SGF;
      stateRef.sgfHint = '';
      onRender();
    });
  }

  if (savePlayBtn) savePlayBtn.addEventListener('click', () => {
    const res = inspectSgfDraft(stateRef.sgfDraftText);
    if (!res.ok) return;
    soundEngine.playUnlock();
    const packName = (stateRef.sgfDraftName || '我的 SGF 题本').trim();
    const pack = store.addCustomSgfPack({
      name: packName,
      sgfText: stateRef.sgfDraftText.trim(),
      count: res.levels.length,
    });
    const levels = parseSgfLevels(pack.sgfText, {
      idPrefix: pack.id,
      unitId: 3,
      nodeId: 'custom',
      scaffoldMode: 'tap_inspect',
      titlePrefix: pack.name,
    });
    onClose();
    onStartLevels({
      levels,
      sessionMeta: {
        sessionId: null,
        title: `📥 ${pack.name}`,
        nodeId: 'custom',
        badgeId: null,
        isSingleTest: false,
      },
    });
  });

  root.querySelectorAll('[data-play-pack]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-play-pack');
      const pack = store.getState().customSgfPacks.find((p) => p.id === pid);
      if (!pack) return;
      soundEngine.playTap();
      const levels = parseSgfLevels(pack.sgfText, {
        idPrefix: pack.id,
        unitId: 3,
        nodeId: 'custom',
        scaffoldMode: 'tap_inspect',
        titlePrefix: pack.name,
      });
      onClose();
      onStartLevels({
        levels,
        sessionMeta: {
          sessionId: null,
          title: `📥 ${pack.name}`,
          nodeId: 'custom',
          badgeId: null,
          isSingleTest: false,
        },
      });
    });
  });

  root.querySelectorAll('[data-copy-pack]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-copy-pack');
      const pack = store.getState().customSgfPacks.find((p) => p.id === pid);
      if (!pack) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pack.sgfText).catch(() => {});
      }
      soundEngine.playTap();
      btn.textContent = '✓';
      setTimeout(() => {
        btn.textContent = '📋';
      }, 900);
    });
  });

  root.querySelectorAll('[data-del-pack]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-del-pack');
      store.deleteCustomSgfPack(pid);
      onRender();
    });
  });
}
