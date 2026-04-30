import type { CSSProperties } from "react";
import {
  DEFAULT_PAYMENT_THEME,
  type PaymentTheme,
} from "@/lib/payment/types";

type PaymentThemeStyle = CSSProperties & Record<`--payment-${string}`, string>;

export function getThemeStyle(theme?: PaymentTheme): PaymentThemeStyle {
  const resolvedTheme = theme ?? DEFAULT_PAYMENT_THEME;

  return {
    "--payment-background-page": resolvedTheme["background-page"],
    "--payment-background-box": resolvedTheme["background-box"],
    "--payment-background-field": resolvedTheme["background-field"],
    "--payment-status-waiting": resolvedTheme["status-waiting"],
    "--payment-status-done": resolvedTheme["status-done"],
    "--payment-price-down": resolvedTheme["price-down"],
    "--payment-price-up": resolvedTheme["price-up"],
    "--payment-outline-box": resolvedTheme["outline-box"],
    "--payment-outline-field": resolvedTheme["outline-field"],
    "--payment-text-primary": resolvedTheme["text-primary"],
    "--payment-text-secondary": resolvedTheme["text-secondary"],
  };
}
