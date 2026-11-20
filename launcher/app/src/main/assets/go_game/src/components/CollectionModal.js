import { STONE_SKINS, BOARD_THEMES, BADGES } from '../data/catalog.js';
import { store } from '../state/store.js';

export function renderCollectionModal({ activeTab = 'skins', onTabChange, onClose }) {
  const st = store.getState();

  let bodyHtml = '';
  if (activeTab === 'skins') {
    bodyHtml = `
      <div class="item-grid">
        ${STONE_SKINS.map((skin) => {
          const unlocked = st.unlockedStoneSkins.includes(skin.id);
          const equipped = st.activeStoneSkin === skin.id;
          const canBuy = st.bambooCoins >= skin.price;
          return `
            <div class="shop-card ${equipped ? 'equipped' : ''}">
              <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:32px;">${skin.preview}</span>
                <div>
                  <div style="font-weight:900;font-size:15px;">${skin.name}</div>
                  <div style="font-size:12px;color:var(--ink-muted);">${skin.desc}</div>
                </div>
              </div>
              ${
                equipped
                  ? `<span class="icon-pill active-green">使用中</span>`
                  : unlocked
                  ? `<button class="btn-3d btn-blue" style="padding:8px 14px;font-size:13px;" data-buy-skin="${skin.id}" data-price="0">换上</button>`
                  : `<button class="btn-3d btn-gold" style="padding:8px 14px;font-size:13px;" ${canBuy ? '' : 'disabled'} data-buy-skin="${skin.id}" data-price="${skin.price}">🎋 ${skin.price}</button>`
              }
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else if (activeTab === 'themes') {
    bodyHtml = `
      <div class="item-grid">
        ${BOARD_THEMES.map((theme) => {
          const unlocked = st.unlockedBoardThemes.includes(theme.id);
          const equipped = st.activeBoardTheme === theme.id;
          const canBuy = st.bambooCoins >= theme.price;
          return `
            <div class="shop-card ${equipped ? 'equipped' : ''}">
              <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:32px;">${theme.preview}</span>
                <div>
                  <div style="font-weight:900;font-size:15px;">${theme.name}</div>
                  <div style="font-size:12px;color:var(--ink-muted);">${theme.desc}</div>
                </div>
              </div>
              ${
                equipped
                  ? `<span class="icon-pill active-green">使用中</span>`
                  : unlocked
                  ? `<button class="btn-3d btn-blue" style="padding:8px 14px;font-size:13px;" data-buy-theme="${theme.id}" data-price="0">换上</button>`
                  : `<button class="btn-3d btn-gold" style="padding:8px 14px;font-size:13px;" ${canBuy ? '' : 'disabled'} data-buy-theme="${theme.id}" data-price="${theme.price}">🎋 ${theme.price}</button>`
              }
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else {
    bodyHtml = `
      <div class="badge-grid">
        ${BADGES.map((b) => {
          const earned = st.unlockedBadges.includes(b.id);
          return `
            <div class="badge-card ${earned ? 'earned' : 'locked-badge'}">
              <div style="font-size:34px;margin-bottom:4px;">${b.icon}</div>
              <div style="font-weight:900;font-size:14px;">${b.name}</div>
              <div style="font-size:11px;color:var(--ink-muted);margin-top:2px;">${b.desc}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return `
    <div class="modal-backdrop" data-modal-bg="true">
      <div class="modal-card">
        <div class="modal-header">
          <h3>🎒 阿竹小仓库</h3>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="icon-pill active-gold">🎋 ${st.bambooCoins}</span>
            <button class="icon-pill" data-close-modal="true">✕</button>
          </div>
        </div>
        <div class="tab-row">
          <button class="tab-btn ${activeTab === 'skins' ? 'active' : ''}" data-tab="skins">棋子皮肤</button>
          <button class="tab-btn ${activeTab === 'themes' ? 'active' : ''}" data-tab="themes">棋盘主题</button>
          <button class="tab-btn ${activeTab === 'badges' ? 'active' : ''}" data-tab="badges">荣誉徽章</button>
        </div>
        ${bodyHtml}
      </div>
    </div>
  `;
}

export function bindCollectionEvents(root, { onTabChange, onClose, onRefresh }) {
  root.querySelectorAll('[data-close-modal="true"]').forEach((el) => el.addEventListener('click', onClose));
  const bg = root.querySelector('[data-modal-bg="true"]');
  if (bg) {
    bg.addEventListener('click', (e) => {
      if (e.target === bg) onClose();
    });
  }
  root.querySelectorAll('[data-tab]').forEach((el) => {
    el.addEventListener('click', () => onTabChange(el.getAttribute('data-tab')));
  });
  root.querySelectorAll('[data-buy-skin]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-buy-skin');
      const price = Number(el.getAttribute('data-price'));
      store.buyOrEquipSkin(id, price);
      onRefresh();
    });
  });
  root.querySelectorAll('[data-buy-theme]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-buy-theme');
      const price = Number(el.getAttribute('data-price'));
      store.buyOrEquipTheme(id, price);
      onRefresh();
    });
  });
}
