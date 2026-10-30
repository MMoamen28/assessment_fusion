"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const handleInterval = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    const intervalId = setInterval(handleInterval, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [router, intervalMs]);

  return null;
}
