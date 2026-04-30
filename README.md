# OpenPay API

Base URL for local development:

```txt
http://localhost:3000
```

All API success responses return HTTP `200`.

All API error responses return HTTP `400` with this shape:

```json
{
  "code": 400,
  "internal": "ERR_INVALID_REQUEST_00"
}
```

Missing public payment pages, for example `GET /unknown`, return a normal page `404`.

## Create Payment

```http
POST /api/payments/create
Content-Type: application/json
```

Creates a payment order, allocates a short identifier, creates a new local Solana wallet for that payment, stores the order in Redis for 48 hours, and returns the payment address.

`amount.value` is the SOL amount to be paid. The API fetches the current SOL/USD price and stores `payment.amount.notional` for display. `amount.change` is optional and must be between `-1` and `1`; for example `-0.2` displays as `-20%`.

```json
{
  "recipient": "7WP1UFKe3LmXLvmaXxT9JXonj9877p6xgNh8JZeoPQMb",
  "network": "dev",
  "meta": {
    "name": "Payment 123",
    "description": "This is a test payment.",
    "redirect": {
      "finished": "https://example.com/finished",
      "cancelled": "https://example.com/cancelled"
    },
    "theme": {
      "background-page": "#08111f",
      "background-box": "#0f1f36",
      "background-field": "#162b49",
      "status-waiting": "#4b607a",
      "status-done": "#38bdf8",
      "price-down": "#22c55e",
      "price-up": "#ef4444",
      "outline-box": "#294566",
      "outline-field": "#355578",
      "text-primary": "#e8f3ff",
      "text-secondary": "#9bb4d0"
    }
  },
  "amount": {
    "value": 0.3,
    "change": -0.2
  }
}
```

Response:

```json
{
  "identifier": "a1b2c3d4e5f6",
  "address": "9ix7QnVgVhG6T...",
  "payment": {
    "amount": {
      "value": 0.3,
      "notional": 42.17,
      "currency": "$",
      "change": -0.2
    }
  }
}
```

cURL:

```bash
curl -X POST "http://localhost:3000/api/payments/create" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "7WP1UFKe3LmXLvmaXxT9JXonj9877p6xgNh8JZeoPQMb",
    "network": "dev",
    "meta": {
      "name": "Payment 123",
      "description": "This is a test payment.",
      "theme": {
        "background-page": "#08111f",
        "background-box": "#0f1f36",
        "background-field": "#162b49",
        "status-waiting": "#4b607a",
        "status-done": "#38bdf8",
        "price-down": "#22c55e",
        "price-up": "#ef4444",
        "outline-box": "#294566",
        "outline-field": "#355578",
        "text-primary": "#e8f3ff",
        "text-secondary": "#9bb4d0"
      }
    },
    "amount": {
      "value": 0.3,
      "change": -0.2
    }
  }'
```

## Payment Status

```http
GET /api/payments/{identifier}/status
```

Returns public payment status data. This endpoint also refreshes the Solana wallet balance. If the balance is below the requested value, the payment stays pending. If the balance is equal or above the requested value, the backend attempts to move the full available balance minus the Solana fee to the original `recipient`.

Response:

```json
{
  "identifier": "a1b2c3d4e5f6",
  "address": "9ix7QnVgVhG6T...",
  "network": "dev",
  "meta": {
    "name": "Payment 123",
    "description": "This is a test payment.",
    "redirect": {
      "finished": "https://example.com/finished",
      "cancelled": "https://example.com/cancelled"
    },
    "theme": {
      "background-page": "#08111f",
      "background-box": "#0f1f36",
      "background-field": "#162b49",
      "status-waiting": "#4b607a",
      "status-done": "#38bdf8",
      "price-down": "#22c55e",
      "price-up": "#ef4444",
      "outline-box": "#294566",
      "outline-field": "#355578",
      "text-primary": "#e8f3ff",
      "text-secondary": "#9bb4d0"
    }
  },
  "balance": {
    "lamports": 200000000,
    "solana": 0.2
  },
  "status": {
    "created": "2026-04-30T13:00:42Z",
    "paid": null,
    "moved": null
  },
  "payment": {
    "amount": {
      "value": 0.3,
      "notional": 42.17,
      "currency": "$",
      "change": -0.2
    }
  }
}
```

cURL:

```bash
curl "http://localhost:3000/api/payments/a1b2c3d4e5f6/status"
```

## Payment Receipt

```http
GET /api/payments/{identifier}/receipt
```

Returns receipt data for a payment. This endpoint also refreshes payment status before responding.

Response:

```json
{
  "identifier": "a1b2c3d4e5f6",
  "status": {
    "created": "2026-04-30T13:00:42Z",
    "paid": "2026-04-30T13:01:10Z",
    "moved": "2026-04-30T13:01:14Z"
  },
  "meta": {
    "name": "Payment 123",
    "description": "This is a test payment.",
    "redirect": {
      "finished": "https://example.com/finished",
      "cancelled": "https://example.com/cancelled"
    }
  },
  "payment": {
    "amount": {
      "value": 0.3,
      "notional": 42.17,
      "currency": "$",
      "change": -0.2
    }
  }
}
```

cURL:

```bash
curl "http://localhost:3000/api/payments/a1b2c3d4e5f6/receipt"
```

## Public Payment Page

```http
GET /{identifier}
```

Serves the public payment page if the payment exists. The page does not receive prepared payment data from the backend. It loads a skeleton first, then polls:

```http
GET /api/payments/{identifier}/status
```

Polling interval:

```txt
2000ms
```

If `meta.redirect.cancelled` exists, the page shows a Cancel action and redirects to that URL when clicked.

If `meta.redirect.finished` exists, the page redirects there after `status.moved` is set.

## Network Values

```ts
type Network = "dev" | "test" | "main";
```

`dev` and `test` are displayed with a badge on the public payment page.

## Theme Values

All theme fields are optional. If `meta.theme` is omitted, the default theme is used. If `meta.theme` is provided, unsupported keys or non-hex values return `ERR_INVALID_REQUEST_00`.

```ts
type Theme = {
  "background-page"?: string;
  "background-box"?: string;
  "background-field"?: string;
  "status-waiting"?: string;
  "status-done"?: string;
  "price-down"?: string;
  "price-up"?: string;
  "outline-box"?: string;
  "outline-field"?: string;
  "text-primary"?: string;
  "text-secondary"?: string;
};
```

Hex colors may be 3 or 6 digit values:

```txt
#fff
#ffffff
```

## Status Fields

```ts
type PaymentStatus = {
  created: string | null;
  paid: string | null;
  moved: string | null;
};
```

`created` is set when the payment order is created.

`paid` is set when the payment wallet balance is at least `amount.value`.

`moved` is set when funds have been moved to the original `recipient`.
