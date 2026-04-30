import { AppError, apiErrorResponse, jsonNoStore } from "@/lib/http";
import { refreshPaymentStatus, toReceiptResponse } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    identifier: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { identifier } = await context.params;
    const payment = await refreshPaymentStatus(identifier);

    if (!payment) {
      throw new AppError("PAYMENT_NOT_FOUND", "Payment not found.");
    }

    return jsonNoStore(toReceiptResponse(payment));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
