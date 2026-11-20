import { store } from './store.js';

function getBridge() {
  return typeof window !== 'undefined' && window.TvUnlockBridge ? window.TvUnlockBridge : null;
}

export function isTvUnlockMode() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('mode') === 'tv_unlock' || Boolean(getBridge());
}

export function getTvBonusMinutes() {
  const bridge = getBridge();
  if (bridge && typeof bridge.getBonusMinutes === 'function') {
    try {
      const m = Number(bridge.getBonusMinutes());
      if (Number.isFinite(m) && m > 0) return m;
    } catch {
      // fallback below
    }
  }
  if (typeof window === 'undefined') return 30;
  const raw = Number(new URLSearchParams(window.location.search).get('bonusMin'));
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
}

export function getRewardedSessionIds() {
  const bridge = getBridge();
  if (bridge && typeof bridge.getRewardedLevelIds === 'function') {
    try {
      const raw = bridge.getRewardedLevelIds();
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed)) return new Set(parsed.map(String));
    } catch {
      // fallback below
    }
  }
  const completedSessions = store.getState().completedSessions || {};
  return new Set(Object.keys(completedSessions));
}

export function notifyTvLevelPassed(levelId) {
  const bridge = getBridge();
  if (bridge && typeof bridge.onLevelPassed === 'function') {
    try {
      bridge.onLevelPassed(String(levelId));
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function closeTvUnlock() {
  const bridge = getBridge();
  if (bridge && typeof bridge.close === 'function') {
    try {
      bridge.close();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
