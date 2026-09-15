'use client';

/**
 * High-tech synthetic audio chimes using the Web Audio API.
 * Zero external audio files or bandwidth required; works seamlessly in modern browsers.
 */

class AudioChimeEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playCallChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Two-tone modern call chime (D5 -> A5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch {}
  }

  playSeatChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Upward arpeggio chime (C5 -> E5 -> G5 -> C6)
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    } catch {}
  }

  playAlertChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  /**
   * Soothing Restaurant Notification Chime for customer devices.
   * Plays a warm, melodic acoustic bell harmonic sequence (C5 -> E5 -> G5 -> C6)
   * with smooth natural decay, coupled with gentle phone haptic vibration.
   */
  playBuzzerSound() {
    // 1. Hardware vibration on mobile devices
    this.triggerPhoneVibration([300, 120, 300, 120, 500]);

    // 2. Audible soothing acoustic chime synth
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Soothing 4-note ascending bell chime: C5 -> E5 -> G5 -> C6
      const notes = [
        { freq: 523.25, time: 0, dur: 0.7, vol: 0.2 },
        { freq: 659.25, time: 0.16, dur: 0.7, vol: 0.22 },
        { freq: 783.99, time: 0.32, dur: 0.75, vol: 0.25 },
        { freq: 1046.50, time: 0.48, dur: 1.1, vol: 0.28 },
      ];

      notes.forEach(({ freq, time, dur, vol }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Warm pure sine wave with subtle harmonic body
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        // Gentle acoustic envelope: smooth attack -> resonant exponential decay
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(vol, now + time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      });
    } catch {}
  }

  triggerPhoneVibration(pattern: number[] = [400, 150, 400]) {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  }
}

export const chimeEngine = new AudioChimeEngine();
