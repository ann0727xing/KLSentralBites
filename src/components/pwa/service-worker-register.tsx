"use client";

import { useEffect } from "react";

/**
 * Production: register SW with updateViaCache:none so /sw.js is always revalidated.
 * Development: unregister any SW so caching never interferes with HMR.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => {
          void reg.unregister();
        });
      });
      return;
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((reg) => {
          const recheck = () => reg.update().catch(() => undefined);
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") recheck();
          });
          window.addEventListener("focus", recheck);
        })
        .catch(() => {
          /* non-fatal */
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
