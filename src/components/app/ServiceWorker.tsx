"use client";

import { useEffect } from "react";

export default function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[NullSpace SW] Registered:", reg.scope);

        // Check for updates every hour
        setInterval(() => reg.update(), 3600000);
      })
      .catch((err) => console.warn("[NullSpace SW] Registration failed:", err));
  }, []);

  return null;
}
