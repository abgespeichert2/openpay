"use client";

import { ChevronLeft } from "lucide-react";
import type { PaymentNetwork } from "@/lib/payment/types";

interface HeaderProps {
  name: string;
  description: string;
  network: PaymentNetwork;
  onCancel?: () => void;
}

function NetworkBadge({ network }: { network: PaymentNetwork }) {
  if (network === "main") {
    return null;
  }

  return (
    <span
      className="rounded-full px-2 py-1 text-[8px] font-semibold uppercase leading-none"
      style={{
        backgroundColor: "var(--payment-text-primary)",
        color: "var(--payment-background-box)",
      }}
    >
      {network}
    </span>
  );
}

export function Header({ name, description, network, onCancel }: HeaderProps) {
  return (
    <header className="mb-3 px-2">
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="mb-3 inline-flex cursor-pointer items-center gap-1 text-xs transition-opacity hover:opacity-70"
          style={{
            color: "var(--payment-text-secondary)",
          }}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Cancel
        </button>
      ) : null}
      <div className="flex items-center gap-2">
        <h1
          className="text-xl font-semibold"
          style={{
            color: "var(--payment-text-primary)",
          }}
        >
          {name}
        </h1>
        <NetworkBadge network={network} />
      </div>
      <p
        className="mt-1 text-sm leading-5"
        style={{
          color: "var(--payment-text-primary)",
        }}
      >
        {description}
      </p>
    </header>
  );
}
