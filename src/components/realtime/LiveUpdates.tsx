"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface LiveUpdatesProps {
  url: string;
  fallbackIntervalMs?: number;
}

export function LiveUpdates({ url, fallbackIntervalMs = 30000 }: LiveUpdatesProps) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let pollTimer: NodeJS.Timeout | null = null;

    const triggerRefresh = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        router.refresh();
      }, 400);
    };

    try {
      es = new EventSource(url);

      es.onopen = () => {
        setConnected(true);
      };

      es.onerror = () => {
        setConnected(false);
      };

      es.onmessage = (event) => {
        // Debounce router.refresh() on incoming data
        if (event.data) {
          triggerRefresh();
        }
      };
    } catch {
      // EventSource instantiation failed
    }

    // Polling fallback when disconnected
    pollTimer = setInterval(() => {
      if (!document.hidden && !connected) {
        router.refresh();
      }
    }, fallbackIntervalMs);

    const handleVisibilityChange = () => {
      // Pause or resume behavior handled naturally by checking document.hidden in interval
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (es) {
        es.close();
      }
    };
  }, [url, fallbackIntervalMs, router, connected]);

  const intervalSeconds = Math.max(1, Math.round(fallbackIntervalMs / 1000));

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        fontSize: "0.75rem",
        color: connected ? "var(--success, #16a34a)" : "var(--text-muted, #64748b)",
        verticalAlign: "middle",
      }}
      title={connected ? "Connected to realtime updates" : "Polling fallback active"}
    >
      <span
        style={{
          display: "inline-block",
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: connected ? "var(--success, #16a34a)" : "var(--warning, #eab308)",
        }}
      />
      <span>
        {connected ? "Live" : `Reconnecting, refreshing every ${intervalSeconds}s`}
      </span>
    </div>
  );
}
