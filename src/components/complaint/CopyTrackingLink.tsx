"use client";

import React, { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";

interface CopyTrackingLinkProps {
  publicToken: string;
}

const emptySubscribe = () => () => {};

export function CopyTrackingLink({ publicToken }: CopyTrackingLinkProps) {
  const [copied, setCopied] = useState(false);
  const [fallbackMsg, setFallbackMsg] = useState<string | null>(null);

  const origin = useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => "",
  );

  const trackingPath = `/track/${publicToken}`;
  const fullUrl = origin ? `${origin}${trackingPath}` : trackingPath;

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setFallbackMsg(null);
        setTimeout(() => setCopied(false), 3000);
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch {
      setFallbackMsg("Please copy the URL manually from the input below.");
    }
  };

  return (
    <div style={{ marginTop: "0.5rem" }}>
      <label htmlFor="public-tracking-url" className="field-label">
        Public Tracking Link
      </label>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          id="public-tracking-url"
          readOnly
          value={fullUrl}
          className="input"
          onFocus={(e) => e.target.select()}
        />
        <Button type="button" variant="secondary" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy link"}
        </Button>
      </div>
      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
        Share this with the complainant
      </p>
      {fallbackMsg && (
        <span style={{ fontSize: "0.8125rem", color: "var(--danger)" }}>
          {fallbackMsg}
        </span>
      )}
    </div>
  );
}
