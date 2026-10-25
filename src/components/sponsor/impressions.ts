"use client";

import { type RefObject, useEffect } from "react";

interface Impression {
  b: string;
  p: string;
  c: string;
}

const queue: Impression[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

function flush() {
  clearTimeout(timer);
  timer = undefined;
  if (queue.length === 0) return;
  const body = JSON.stringify({ events: queue.splice(0, 20) });
  const blob = new Blob([body], { type: "application/json" });
  if (!navigator.sendBeacon?.("/api/sponsors/impression", blob)) {
    fetch("/api/sponsors/impression", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
}

/** Counts one impression per mount once the ad has been at least half visible for a full second. */
export function useImpression(ref: RefObject<HTMLElement | null>, impression: Impression | null) {
  const key = impression ? `${impression.b}|${impression.p}|${impression.c}` : null;
  useEffect(() => {
    const el = ref.current;
    if (!el || !impression || typeof IntersectionObserver === "undefined") return;
    let seen: ReturnType<typeof setTimeout> | undefined;
    let done = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (done) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && document.visibilityState === "visible") {
          seen ??= setTimeout(() => {
            done = true;
            observer.disconnect();
            queue.push(impression);
            timer ??= setTimeout(flush, 2_000);
          }, 1_000);
        } else {
          clearTimeout(seen);
          seen = undefined;
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(el);
    return () => {
      clearTimeout(seen);
      observer.disconnect();
    };
  }, [ref, key]);
}
