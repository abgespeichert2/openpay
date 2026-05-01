OpenPay creates short-lived Solana payment links through a small REST API. A typical integration starts in your backend: create a payment order, receive a short identifier and a generated Solana wallet address, then send the user to the public payment page at `/{identifier}`. The page polls the status API, shows the remaining SOL amount, and updates automatically as funds arrive.

### POST /api/payments/create

Use this endpoint from your backend to create a new payment order. The request must include the final Solana `recipient`, the Solana `network`, display metadata, and the SOL amount to collect.

OpenPay will generate a short payment identifier, create a fresh Solana wallet for this payment, fetch the current SOL/USD price, calculate the display notional, store everything in Redis, and return the public payment address.

`amount.value` is the SOL amount the user should pay.

`amount.change` is optional. If provided, it is displayed on the payment page as a percentage. For example `-0.2` becomes `-20%`. If it is `0`, it is not displayed.

`meta.redirect` is optional. If `cancelled` is present, the payment page shows a cancel action. If `finished` is present, the payment page redirects there after settlement is completed.

Request:

```json
{
  "recipient": "7WP1UFKe3LmXLvmaXxT9JXonj9877p6xgNh8JZeoPQMb",
  "network": "dev",
  "meta": {
    "name": "Payment 123",
    "description": "Complete this payment by sending the displayed SOL amount to the recipient address.",
    "redirect": {
      "finished": "https://example.com/finished",
      "cancelled": "https://example.com/cancelled"
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

After this response, send the user to:

```txt
/{identifier}
```

Minimal request:

```json
{
  "recipient": "7WP1UFKe3LmXLvmaXxT9JXonj9877p6xgNh8JZeoPQMb",
  "network": "dev",
  "meta": {
    "name": "Payment 123",
    "description": "Complete this payment by sending the displayed SOL amount to the recipient address."
  },
  "amount": {
    "value": 0.3
  }
}
```

### GET /{identifier}

This is the public payment page. Users should open this page after your backend creates a payment. The page displays the payment title, description, amount left to pay, generated wallet address, current balance progress, and payment status.

The page does not receive prepared payment data from the backend. It renders a skeleton first and then polls the public status API every two seconds.

Request:

```txt
GET /a1b2c3d4e5f6
```

Expected result:

```txt
Public checkout page for payment a1b2c3d4e5f6
```

If the payment does not exist or has expired, the user receives the default Next.js `404` page.

### GET /api/payments/{identifier}/status

Use this endpoint to read the current public state of a payment. The payment page uses it automatically, but your application can call it directly as well.

Every status request refreshes the Solana wallet balance. If the generated wallet has received less than `amount.value`, the payment stays pending. If it has received at least `amount.value`, OpenPay marks the payment as paid and attempts to move the available balance, minus the Solana transaction fee, to the original `recipient`.

If the user underpays, the payment remains pending and the page shows the remaining SOL amount. If the user overpays, OpenPay does not keep the excess; it attempts to forward the available balance to the recipient as well.

Request:

```txt
GET /api/payments/a1b2c3d4e5f6/status
```

Response:

```json
{
  "identifier": "a1b2c3d4e5f6",
  "address": "9ix7QnVgVhG6T...",
  "network": "dev",
  "meta": {
    "name": "Payment 123",
    "description": "Complete this payment by sending the displayed SOL amount to the recipient address.",
    "redirect": {
      "finished": "https://example.com/finished",
      "cancelled": "https://example.com/cancelled"
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

In this example, the payment expects `0.3 SOL`, but the wallet only contains `0.2 SOL`. The payment is still pending.

Once enough SOL has arrived and settlement succeeds, the status looks like this:

```json
{
  "created": "2026-04-30T13:00:42Z",
  "paid": "2026-04-30T13:01:10Z",
  "moved": "2026-04-30T13:01:14Z"
}
```

### GET /api/payments/{identifier}/receipt

Use this endpoint when you want a compact receipt-style response for an existing payment. It includes the identifier, timestamps, metadata, and payment amount. It does not include the live wallet balance.

Like the status endpoint, receipt requests also refresh payment state before responding.

Request:

```txt
GET /api/payments/a1b2c3d4e5f6/receipt
```

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
    "description": "Complete this payment by sending the displayed SOL amount to the recipient address.",
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

Networks

`network` must be one of:

```ts
type Network = "dev" | "test" | "main";
```

`dev` and `test` are displayed with a small badge on the payment page.

Status fields

`created` is set when OpenPay creates the payment order.

`paid` is set when the generated payment wallet has received at least `amount.value`.

`moved` is set when OpenPay has moved the wallet balance to the original recipient.

```ts
type Status = {
  created: string | null;
  paid: string | null;
  moved: string | null;
};
```

Amount fields

`value` is the SOL amount that should be paid.

`notional` is calculated by OpenPay from the current SOL/USD price.

`currency` is always `$`.

`change` is optional and displayed as a percentage on the payment page if no partial payment is currently visible.

```ts
type Amount = {
  value: number;
  notional: number;
  currency: "$";
  change?: number;
};
```

Redirect fields

Both redirect URLs are optional.

`cancelled` is used when the user clicks the cancel action on the payment page.

`finished` is used after settlement has completed.

```ts
type Redirect = {
  finished?: string;
  cancelled?: string;
};
```
