import { NextResponse } from "next/server";

const API_ERROR_STATUS = 400;

export class AppError extends Error {
  public readonly code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function readJsonRequest(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new AppError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Request body must be application/json.",
    );
  }

  try {
    return await request.json();
  } catch {
    throw new AppError("INVALID_JSON", "Request body is not valid JSON.");
  }
}

export function jsonNoStore<TBody>(body: TBody, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function toInternalErrorCode(code: string): string {
  const normalizedCode = code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return `ERR_${normalizedCode || "UNKNOWN"}_00`;
}

export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return jsonNoStore(
      {
        code: API_ERROR_STATUS,
        internal: toInternalErrorCode(error.code),
      },
      API_ERROR_STATUS,
    );
  }

  console.error("Unhandled API error", error);

  return jsonNoStore(
    {
      code: API_ERROR_STATUS,
      internal: "ERR_INTERNAL_SERVER_ERROR_00",
    },
    API_ERROR_STATUS,
  );
}
