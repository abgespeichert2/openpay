"use client";

import { useState } from "react";

interface RecipientProps {
  address: string;
  onCopyError: (message: string) => void;
}

export function Recipient({ address, onCopyError }: RecipientProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      onCopyError("Address could not be copied.");
    }
  };

  return (
    <section className="mb-4 pt-3">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase text-[var(--text-secondary)]">
          Recipient
        </p>
      </div>
      <button
        type="button"
        onClick={copyAddress}
        className="w-full cursor-pointer truncate rounded-lg border border-[var(--border)] bg-[var(--field)] px-2.5 py-1.5 text-left text-[11px] leading-3 text-[var(--text-primary)] transition-colors [font-family:var(--font-geist-mono),ui-monospace,monospace] hover:border-[var(--border-hover)] hover:bg-[var(--field-hover)]"
      >
        <span
          key={copied ? "copied" : "address"}
          className="animate-[fade-in_160ms_ease-out]"
        >
          {copied ? "Copied" : address}
        </span>
      </button>
    </section>
  );
}
