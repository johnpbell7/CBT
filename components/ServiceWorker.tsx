"use client";

import { useEffect } from "react";
import { at } from "@/lib/base";

/** Registers the app-shell cache so the toolkit opens with no connection. */
export default function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;
    const register = () => {
      navigator.serviceWorker.register(at("/sw.js"), { scope: at("/") }).catch(() => {
        /* offline support is a bonus, never a blocker */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
