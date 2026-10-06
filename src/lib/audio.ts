import { useSyncExternalStore } from "react";

// Web Audio API Synthesizer for premium, zero-asset UI audio feedback

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("taskflow_sound_enabled") !== "false";
}

function subscribeSound(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("taskflow-sound-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("taskflow-sound-change", callback);
  };
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(
    subscribeSound,
    () => isSoundEnabled(),
    () => true
  );
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("taskflow_sound_enabled", enabled ? "true" : "false");
  window.dispatchEvent(new Event("taskflow-sound-change"));
}

/**
 * Celebratory 3-note ascending chime when completing a task (C5 -> E5 -> G5)
 */
export function playSuccessChime() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  const startTime = ctx.currentTime + 0.02;

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime + idx * 0.08);

    // Smooth envelope attack and decay
    const noteStart = startTime + idx * 0.08;
    gain.gain.setValueAtTime(0.001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteStart);
    osc.stop(noteStart + 0.3);
  });
}

/**
 * Modern soft dual-tone ping for incoming notifications (D5 -> A5)
 */
export function playNotificationPing() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [587.33, 880.0]; // D5, A5
  const startTime = ctx.currentTime + 0.01;

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime + idx * 0.07);

    const noteStart = startTime + idx * 0.07;
    gain.gain.setValueAtTime(0.001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.15, noteStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteStart);
    osc.stop(noteStart + 0.24);
  });
}

/**
 * Subtle low pop/swish when a task or item is deleted/trashed
 */
export function playTrashSound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const startTime = ctx.currentTime + 0.01;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(260, startTime);
  osc.frequency.exponentialRampToValueAtTime(110, startTime + 0.15);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + 0.2);
}

export const playDeleteSound = playTrashSound;

