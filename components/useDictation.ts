"use client";

import { useEffect, useState } from "react";
import { Listener } from "@/lib/recorder";

/**
 * Whether live dictation exists in this browser.
 *
 * `null` until after mount: the server can't know, and rendering a guess would
 * make the first client paint disagree with the markup it hydrates.
 */
export function useDictation(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => setSupported(Listener.supported()), []);
  return supported;
}
