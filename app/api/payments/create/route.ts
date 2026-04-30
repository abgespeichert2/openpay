import { apiErrorResponse, jsonNoStore, readJsonRequest } from "@/lib/http";
import { createPaymentOrder, toCreatePaymentResponse } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJsonRequest(request);
    const payment = await createPaymentOrder(body);

    return jsonNoStore(toCreatePaymentResponse(payment));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
