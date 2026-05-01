<p align="left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/abgespeichert2/OpenPay/main/.github/assets/white.1024.png">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/abgespeichert2/OpenPay/main/.github/assets/black.1024.png">
    <img src="https://raw.githubusercontent.com/abgespeichert2/OpenPay/main/.github/assets/black.1024.png" height="128">
  </picture>
</p>

# Overview
OpenPay is a lightweight Next.js based Solana payment processor designed around a simple payment-link workflow. A backend service creates a payment order through the public REST API, OpenPay generates a short identifier and a dedicated Solana wallet for that order, stores the full payment state in Redis, and exposes a public checkout page at `/{identifier}`. The checkout page shows the required SOL amount, recipient address, current payment progress, and live status updates through client-side polling. Once the generated wallet receives enough SOL, OpenPay marks the payment as paid and attempts to forward the available balance, minus Solana network fees, to the original recipient address.

The app is built with Next.js App Router, TypeScript, Redis for durable key-value storage, and `@solana/web3.js` for wallet generation, balance checks, transaction creation, and settlement. Payment records are stored with an expiration window to avoid unbounded Redis growth, while still keeping payment state available long enough for normal checkout flows. The API is intentionally small and direct: create a payment, check its status, retrieve a receipt, and serve the public payment page. Optional redirect URLs allow integrations to send users back to an application after cancellation or successful settlement.

> [!IMPORTANT]
> OpenPay is currently under active development and should be treated as experimental software. It is not yet recommended for production payments, high-value transactions, or environments that require audited security guarantees.

# Activity
![Alt](https://repobeats.axiom.co/api/embed/ef7eef1d9c56b24bd0c4cd1f3f60e78c5f342dbe.svg "Analytics")
