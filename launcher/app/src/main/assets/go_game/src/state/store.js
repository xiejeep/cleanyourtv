import { soundEngine } from '../engine/audio.js';

const STORAGE_KEY = 'panda_go_v1';

const DEFAULT_STATE = {
  completedLevelIds: [],
  completedSessions: {},
  streakDays: 0,
  lastPlayDate: null,
  bambooCoins: 20,
  unlockedStoneSkins: ['dango'],
  activeStoneSkin: 'dango',
  unlockedBoardThemes: ['bamboo'],
  activeBoardTheme: 'bamboo',
  unlockedBadges: [],
  soundEnabled: true,
  ttsEnabled: true,
  parentPreviewMode: false,
  customSgfPacks: [],
};

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function yesterdayKey() {
  const now = new Date(Date.now() - 86400000);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

class Store {
  constructor() {
    this.state = this.load();
    this.listeners = new Set();
    soundEngine.setConfig({
      soundEnabled: this.state.soundEnabled,
      ttsEnabled: this.state.ttsEnabled,
    });
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_STATE,
        ...parsed,
        completedLevelIds: Array.isArray(parsed.completedLevelIds) ? parsed.completedLevelIds : [],
        completedSessions: parsed.completedSessions && typeof parsed.completedSessions === 'object' ? parsed.completedSessions : {},
        unlockedStoneSkins: Array.isArray(parsed.unlockedStoneSkins) ? parsed.unlockedStoneSkins : ['dango'],
        unlockedBoardThemes: Array.isArray(parsed.unlockedBoardThemes) ? parsed.unlockedBoardThemes : ['bamboo'],
        unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges : [],
        customSgfPacks: Array.isArray(parsed.customSgfPacks) ? parsed.customSgfPacks : [],
      };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore storage quota errors
    }
    for (const cb of this.listeners) cb(this.state);
  }

  subscribe(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getState() {
    return this.state;
  }

  toggleSound() {
    this.state.soundEnabled = !this.state.soundEnabled;
    soundEngine.setConfig({ soundEnabled: this.state.soundEnabled });
    this.save();
  }

  toggleTts() {
    this.state.ttsEnabled = !this.state.ttsEnabled;
    soundEngine.setConfig({ ttsEnabled: this.state.ttsEnabled });
    this.save();
  }

  setParentPreviewMode(enabled) {
    this.state.parentPreviewMode = Boolean(enabled);
    this.save();
  }

  recordSessionWin({ sessionId, levelIds, stars, coinsEarned, badgeId }) {
    const levelSet = new Set(this.state.completedLevelIds);
    for (const id of levelIds) levelSet.add(id);
    this.state.completedLevelIds = Array.from(levelSet);

    if (sessionId) {
      const prev = this.state.completedSessions[sessionId];
      this.state.completedSessions[sessionId] = {
        stars: Math.max(stars, prev ? prev.stars : 0),
      };
    }

    const today = todayKey();
    let streakIncreased = false;
    if (this.state.lastPlayDate !== today) {
      if (this.state.lastPlayDate === yesterdayKey()) {
        this.state.streakDays += 1;
      } else {
        this.state.streakDays = 1;
      }
      this.state.lastPlayDate = today;
      streakIncreased = true;
    }

    this.state.bambooCoins += coinsEarned;

    let badgeEarned = false;
    if (badgeId && !this.state.unlockedBadges.includes(badgeId)) {
      this.state.unlockedBadges = [...this.state.unlockedBadges, badgeId];
      badgeEarned = true;
    }

    this.save();
    return { streakIncreased, badgeEarned };
  }

  buyOrEquipSkin(skinId, price) {
    if (!this.state.unlockedStoneSkins.includes(skinId)) {
      if (this.state.bambooCoins < price) return false;
      this.state.bambooCoins -= price;
      this.state.unlockedStoneSkins = [...this.state.unlockedStoneSkins, skinId];
      soundEngine.playUnlock();
    } else {
      soundEngine.playTap();
    }
    this.state.activeStoneSkin = skinId;
    this.save();
    return true;
  }

  buyOrEquipTheme(themeId, price) {
    if (!this.state.unlockedBoardThemes.includes(themeId)) {
      if (this.state.bambooCoins < price) return false;
      this.state.bambooCoins -= price;
      this.state.unlockedBoardThemes = [...this.state.unlockedBoardThemes, themeId];
      soundEngine.playUnlock();
    } else {
      soundEngine.playTap();
    }
    this.state.activeBoardTheme = themeId;
    this.save();
    return true;
  }

  resetProgress() {
    this.state = { ...DEFAULT_STATE };
    soundEngine.setConfig({
      soundEnabled: this.state.soundEnabled,
      ttsEnabled: this.state.ttsEnabled,
    });
    this.save();
  }

  addCustomSgfPack({ name, sgfText, count }) {
    const pack = {
      id: `pack-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: (name || '我的 SGF 题本').trim(),
      sgfText,
      count,
      createdAt: todayKey(),
    };
    this.state.customSgfPacks = [pack, ...this.state.customSgfPacks];
    this.save();
    return pack;
  }

  deleteCustomSgfPack(packId) {
    this.state.customSgfPacks = this.state.customSgfPacks.filter((p) => p.id !== packId);
    this.save();
  }
}

export const store = new Store();
