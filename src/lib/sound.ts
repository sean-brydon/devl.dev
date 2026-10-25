"use client";

import { useSyncExternalStore } from "react";

const KEY = "devl:sound";
const listeners = new Set<() => void>();
let context: AudioContext | null = null;

function read() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(KEY, enabled ? "on" : "off");
  } catch {}
  for (const listener of listeners) listener();
}

export function useSoundEnabled() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    () => false,
  );
}

function drop(ctx: AudioContext, at: number, from: number, to: number, length: number, peak: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + length);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

export function playGoo(step = 0) {
  if (typeof window === "undefined" || !read()) return;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  const now = context.currentTime;
  const base = 420 * 2 ** (Math.min(step, 8) / 24);
  drop(context, now, base * 1.35, base * 0.7, 0.09, 0.07);
  drop(context, now + 0.035, base * 2.1, base * 1.5, 0.05, 0.025);
}
