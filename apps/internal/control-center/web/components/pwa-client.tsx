"use client";

import { useEffect } from "react";

export function PwaClient({
  summary
}: {
  summary?: unknown;
}) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  useEffect(() => {
    if (!summary) {
      return;
    }
    window.localStorage.setItem("ocos:last-summary", JSON.stringify(summary));
  }, [summary]);

  return null;
}
