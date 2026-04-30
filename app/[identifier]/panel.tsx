"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicPaymentStatusResponse } from "@/lib/payment/types";
import { Amount } from "./amount";
import { Credits } from "./credits";
import { Header } from "./header";
import { Recipient } from "./recipient";
import { Skeleton } from "./skeleton";
import { getThemeStyle } from "./theme";
import { Timeline } from "./timeline";

const POLL_INTERVAL_MS = 2_000;

interface PaymentStatusPanelProps {
  identifier: string;
}

export function PaymentStatusPanel({ identifier }: PaymentStatusPanelProps) {
  const [paymentStatus, setPaymentStatus] =
    useState<PublicPaymentStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(`/api/payments/${identifier}/status`, {
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        throw new Error("Status could not be loaded.");
      }

      const nextStatus = (await response.json()) as PublicPaymentStatusResponse;

      setPaymentStatus(nextStatus);
      setError(null);
    },
    [identifier],
  );

  useEffect(() => {
    if (paymentStatus?.status.moved) {
      return;
    }

    let activeController: AbortController | null = null;

    const poll = async () => {
      activeController?.abort();
      activeController = new AbortController();

      try {
        await refreshStatus(activeController.signal);
      } catch (pollError) {
        if (
          pollError instanceof DOMException &&
          pollError.name === "AbortError"
        ) {
          return;
        }

        setError("Status is temporarily unavailable.");
      }
    };

    const intervalId = window.setInterval(poll, POLL_INTERVAL_MS);
    void poll();

    return () => {
      activeController?.abort();
      window.clearInterval(intervalId);
    };
  }, [paymentStatus?.status.moved, refreshStatus]);

  useEffect(() => {
    const finishedRedirect = paymentStatus?.meta.redirect?.finished;

    if (paymentStatus?.status.moved && finishedRedirect) {
      window.location.assign(finishedRedirect);
    }
  }, [paymentStatus?.meta.redirect?.finished, paymentStatus?.status.moved]);

  if (!paymentStatus) {
    return (
      <>
        <Skeleton />
        {error ? (
          <p className="fixed bottom-6 left-1/2 w-[min(calc(100%-2.5rem),28rem)] -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-center text-xs text-amber-900">
            {error}
          </p>
        ) : null}
      </>
    );
  }

  const cancelPayment = () => {
    const cancelledRedirect = paymentStatus.meta.redirect?.cancelled;

    if (cancelledRedirect) {
      window.location.assign(cancelledRedirect);
    }
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center px-5 py-10"
      style={{
        ...getThemeStyle(paymentStatus.meta.theme),
        backgroundColor: "var(--payment-background-page)",
      }}
    >
      <div className="w-full max-w-md">
        <Header
          name={paymentStatus.meta.name}
          description={paymentStatus.meta.description}
          network={paymentStatus.network}
          onCancel={
            paymentStatus.meta.redirect?.cancelled ? cancelPayment : undefined
          }
        />

        <section
          className="rounded-lg border p-4"
          style={{
            backgroundColor: "var(--payment-background-box)",
            borderColor: "var(--payment-outline-box)",
          }}
        >
          <Amount
            amount={paymentStatus.payment.amount}
            balanceSolana={paymentStatus.balance.solana}
          />

          <Recipient
            address={paymentStatus.address}
            onCopyError={setError}
          />

          <Timeline status={paymentStatus.status} />

          {error ? (
            <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-center text-xs text-amber-900">
              {error}
            </p>
          ) : null}
        </section>

        <Credits />
      </div>
    </main>
  );
}
