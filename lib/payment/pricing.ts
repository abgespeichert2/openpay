import { AppError } from "@/lib/http";

const SOL_USD_PRICE_URL = "https://api.coinbase.com/v2/prices/SOL-USD/spot";

interface CoinbaseSpotPriceResponse {
  data?: {
    amount?: unknown;
  };
}

export async function fetchSolUsdPrice(): Promise<number> {
  let response: Response;

  try {
    response = await fetch(SOL_USD_PRICE_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    throw new AppError("SOL_PRICE_UNAVAILABLE", "SOL/USD price fetch failed.");
  }

  if (!response.ok) {
    throw new AppError("SOL_PRICE_UNAVAILABLE", "SOL/USD price is unavailable.");
  }

  let payload: CoinbaseSpotPriceResponse;

  try {
    payload = (await response.json()) as CoinbaseSpotPriceResponse;
  } catch {
    throw new AppError(
      "SOL_PRICE_UNAVAILABLE",
      "SOL/USD price payload is invalid.",
    );
  }

  const price = Number(payload.data?.amount);

  if (!Number.isFinite(price) || price <= 0) {
    throw new AppError("SOL_PRICE_UNAVAILABLE", "SOL/USD price is invalid.");
  }

  return price;
}
