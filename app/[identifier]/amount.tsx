import { Check } from "lucide-react";
import type { PaymentAmount } from "@/lib/payment/types";
import {
  formatNotionalAmount,
  formatSolanaAmount,
  roundSolanaAmount,
} from "./format";

interface AmountProps {
  amount: PaymentAmount;
  balanceSolana: number;
}

function formatChange(value: number): string {
  const percent = Math.abs(value * 100);
  const formattedPercent = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(percent);

  if (value > 0) {
    return `+${formattedPercent}%`;
  }

  if (value < 0) {
    return `-${formattedPercent}%`;
  }

  return `${formattedPercent}%`;
}

export function Amount({ amount, balanceSolana }: AmountProps) {
  const remainingSolana = roundSolanaAmount(
    Math.max(amount.value - balanceSolana, 0),
  );
  const paidSolana = roundSolanaAmount(
    Math.min(Math.max(balanceSolana, 0), amount.value),
  );
  const alreadyPaidText =
    paidSolana > 0 && remainingSolana > 0
      ? `${formatSolanaAmount(paidSolana)} already paid`
      : null;
  const changeText =
    alreadyPaidText || amount.change === undefined || amount.change === 0
      ? null
      : formatChange(amount.change);
  const remainingSolanaText = `${formatSolanaAmount(remainingSolana)} SOL`;
  const displayNotional = `${amount.currency}${formatNotionalAmount(
    amount.notional,
  )}`;
  const amountCaption = `The amount shown is currently valued at approximately ${displayNotional} and should be paid exactly as displayed because underpayments will keep this payment pending while any excess crypto sent cannot be refunded.`;

  return (
    <div className="border-b border-[var(--border-soft)] pb-3">
      <p className="text-[11px] uppercase text-[var(--text-secondary)]">
        Amount
      </p>
      <div className="mt-0.5 flex items-baseline gap-2.5">
        <p className="text-2xl font-semibold text-[var(--text-primary)]">
          {remainingSolanaText}
        </p>
        {alreadyPaidText ? (
          <p className="inline-flex items-center gap-1 text-base font-medium text-[var(--text-primary)]">
            {alreadyPaidText}
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </p>
        ) : null}
        {changeText ? (
          <p
            className={
              amount.change && amount.change < 0
                ? "text-2xl font-light text-[var(--price-down)]"
                : "text-2xl font-light text-[var(--price-up)]"
            }
          >
            {changeText}
          </p>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
        {amountCaption}
      </p>
    </div>
  );
}
