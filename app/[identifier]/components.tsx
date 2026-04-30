"use client";

import { Check, ChevronLeft } from "lucide-react";
import { useState } from "react";
import type { PaymentAmount, PaymentStatus } from "@/lib/payments";
import {
  formatDateTime,
  formatNotionalAmount,
  formatSolanaAmount,
  roundSolanaAmount,
} from "./format";

const STATUS_STEPS: Array<{
  key: keyof PaymentStatus;
  label: string;
}> = [
  {
    key: "created",
    label: "Created",
  },
  {
    key: "paid",
    label: "Paid",
  },
  {
    key: "moved",
    label: "Finished",
  },
];

interface PaymentHeaderProps {
  name: string;
  description: string;
  onCancel?: () => void;
}

export function PaymentHeader({
  name,
  description,
  onCancel,
}: PaymentHeaderProps) {
  return (
    <header className="mb-3 px-2">
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="mb-3 inline-flex cursor-pointer items-center gap-1 text-xs text-stone-500 transition-colors hover:text-stone-950"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Cancel
        </button>
      ) : null}
      <h1 className="text-xl font-semibold text-stone-950">{name}</h1>
      <p className="mt-1 text-sm leading-5 text-stone-950">{description}</p>
    </header>
  );
}

interface AmountSectionProps {
  amount: PaymentAmount;
  balanceSolana: number;
}

export function AmountSection({ amount, balanceSolana }: AmountSectionProps) {
  const remainingSolana = roundSolanaAmount(
    Math.max(amount.solana - balanceSolana, 0),
  );
  const paidSolana = roundSolanaAmount(
    Math.min(Math.max(balanceSolana, 0), amount.solana),
  );
  const alreadyPaidText =
    paidSolana > 0 && remainingSolana > 0
      ? `${formatSolanaAmount(paidSolana)} already paid`
      : null;
  const remainingSolanaText = `${formatSolanaAmount(remainingSolana)} SOL`;
  const displayNotional = `${amount.currency}${formatNotionalAmount(
    amount.notional,
  )}`;
  const amountCaption = `The amount shown is currently valued at approximately ${displayNotional} and should be paid exactly as displayed because underpayments will keep this payment pending while any excess crypto sent cannot be refunded.`;

  return (
    <div className="border-b border-stone-200 pb-3">
      <p className="text-[11px] uppercase text-stone-500">Amount</p>
      <div className="mt-0.5 flex items-baseline gap-2.5">
        <p className="text-2xl font-semibold text-stone-950">
          {remainingSolanaText}
        </p>
        {alreadyPaidText ? (
          <p className="inline-flex items-center gap-1 text-base font-medium text-stone-950">
            {alreadyPaidText}
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </p>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] leading-4 text-stone-500">
        {amountCaption}
      </p>
    </div>
  );
}

interface RecipientAddressProps {
  address: string;
  onCopyError: (message: string) => void;
}

export function RecipientAddress({
  address,
  onCopyError,
}: RecipientAddressProps) {
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
        <p className="text-[11px] uppercase text-stone-500">Recipient</p>
      </div>
      <button
        type="button"
        onClick={copyAddress}
        className="font-mono! w-full cursor-pointer truncate rounded-lg border border-stone-300 bg-stone-50 px-2.5 py-1.5 text-left text-[11px] leading-3 text-stone-900 transition-colors hover:border-stone-400 hover:bg-stone-100"
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

interface StatusTimelineProps {
  status: PaymentStatus;
}

export function StatusTimeline({ status }: StatusTimelineProps) {
  return (
    <section className="grid gap-2.5 border-t border-stone-200 pt-3">
      {STATUS_STEPS.map((step) => {
        const timestamp = status[step.key];
        const isComplete = Boolean(timestamp);

        return (
          <div
            key={step.key}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 text-sm"
          >
            <span
              className={
                isComplete
                  ? "h-2 w-2 rounded-full bg-emerald-500"
                  : "h-2 w-2 rounded-full bg-stone-300"
              }
              aria-hidden="true"
            />
            <span className="text-sm text-stone-950">{step.label}</span>
            <span className="text-[11px] text-stone-500">
              {formatDateTime(timestamp)}
            </span>
          </div>
        );
      })}
    </section>
  );
}

export function PaymentSkeleton() {
  return (
    <section className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-lg border border-stone-300 bg-white p-5">
        <div className="mx-auto mb-3 h-7 w-48 rounded-lg bg-stone-200" />
        <div className="mx-auto mb-6 h-4 w-64 rounded-lg bg-stone-200" />
        <div className="mb-4 h-5 w-36 rounded-lg bg-stone-200" />
        <div className="mb-5 h-16 rounded-lg border border-stone-200 bg-stone-100" />
        <div className="grid gap-3">
          <div className="h-5 rounded-lg bg-stone-200" />
          <div className="h-5 rounded-lg bg-stone-200" />
          <div className="h-5 rounded-lg bg-stone-200" />
        </div>
      </div>
    </section>
  );
}

export function Credits() {
  return (
    <footer className="mt-3 px-2 text-center text-[11px] leading-4 text-stone-500">
      <p>Developed with ❤️ by abgespeichert</p>
      <a
        href="https://github.com/abgespeichert2/openpay"
        target="_blank"
        rel="noreferrer"
        className="text-stone-500 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-700"
      >
        OpenSource on GitHub
      </a>
    </footer>
  );
}
