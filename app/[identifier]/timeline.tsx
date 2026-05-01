import type { PaymentStatus } from "@/lib/payment/types";
import { formatDateTime } from "./format";

const STEPS: Array<{
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

interface TimelineProps {
  status: PaymentStatus;
}

export function Timeline({ status }: TimelineProps) {
  return (
    <section className="grid gap-2.5 border-t border-[var(--border-soft)] pt-3">
      {STEPS.map((step) => {
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
                  ? "h-2 w-2 rounded-full bg-[var(--status-done)]"
                  : "h-2 w-2 rounded-full bg-[var(--status-waiting)]"
              }
              aria-hidden="true"
            />
            <span className="text-sm text-[var(--text-primary)]">
              {step.label}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)]">
              {formatDateTime(timestamp)}
            </span>
          </div>
        );
      })}
    </section>
  );
}
