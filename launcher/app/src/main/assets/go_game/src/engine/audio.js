class SoundEngine {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.ttsEnabled = true;
  }

  setConfig({ soundEnabled, ttsEnabled }) {
    if (typeof soundEnabled === 'boolean') this.soundEnabled = soundEnabled;
    if (typeof ttsEnabled === 'boolean') {
      this.ttsEnabled = ttsEnabled;
      if (!ttsEnabled) this.stopSpeech();
    }
  }

  ensureCtx() {
    if (!this.soundEnabled) return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  tone(freq, duration, type = 'sine', gainVal = 0.14, delay = 0) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playStone() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(135, now + 0.075);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playCapture() {
    this.tone(523.25, 0.09, 'sine', 0.18, 0);
    this.tone(659.25, 0.09, 'sine', 0.18, 0.055);
    this.tone(783.99, 0.16, 'triangle', 0.2, 0.11);
  }

  playAtari() {
    this.tone(240, 0.12, 'triangle', 0.15, 0);
    this.tone(210, 0.14, 'triangle', 0.12, 0.12);
  }

  playConnect() {
    this.tone(440, 0.09, 'sine', 0.12, 0);
    this.tone(554.37, 0.14, 'sine', 0.14, 0.06);
  }

  playTap() {
    this.tone(620, 0.06, 'sine', 0.1, 0);
  }

  playWrong() {
    this.tone(290, 0.15, 'sawtooth', 0.08, 0);
    this.tone(210, 0.22, 'sawtooth', 0.08, 0.14);
  }

  playWin() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => this.tone(n, 0.18, 'triangle', 0.18, idx * 0.09));
  }

  playUnlock() {
    this.tone(587.33, 0.11, 'sine', 0.15, 0);
    this.tone(880, 0.22, 'sine', 0.18, 0.09);
  }

  speak(text) {
    if (!this.ttsEnabled || !text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-CN';
      utter.rate = 1.05;
      utter.pitch = 1.15;
      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find((v) => v.lang && v.lang.toLowerCase().includes('zh'));
      if (zhVoice) utter.voice = zhVoice;
      window.speechSynthesis.speak(utter);
    } catch {
      // 某些无语音引擎环境静默跳过
    }
  }

  stopSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }
}

export const soundEngine = new SoundEngine();
