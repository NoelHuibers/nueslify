import { useEffect } from "react";

/** Registers the offline/install service worker in production builds. */
export function ServiceWorker() {
  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  return null;
}
