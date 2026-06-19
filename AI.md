# AI Disclosure

This file documents any AI-assisted development used in this plugin.

## Tools Used

- GitHub Copilot (code generation and implementation)

## Scope

AI assistance was used in the following areas:

- `mod.ts` — Entry point, lifecycle hooks, tool exports
- `auth.ts` — PayPal OAuth 2.0 token management and API fetch wrapper
- `services/orders.ts` — Order tools (create, capture, show, refund)
- `services/invoices.ts` — Invoice tools (list, create, show)
- `services/payouts.ts` — Payout tool
- `services/products.ts` — Product tools (list, create)
- `services/subscriptions.ts` — Subscription tools (list plans, create)
- `README.md` — Documentation
- `manifest.json` — Manual configuration based on PayPal API reference

## Review

All AI-generated code was reviewed by a human developer, tested thoroughly, and verified to work
correctly before being committed to this repository.

## Certification

I certify that I understand the code being submitted and take full responsibility for its behavior
and security.

## Disclosure in manifest.json

The `manifest.json` file includes this disclosure:

```json
{
  "aiDisclosure": {
    "tools": ["copilot"],
    "generatedFiles": ["mod.ts", "auth.ts", "services/*.ts", "README.md"],
    "humanReviewed": true,
    "statement": "All AI-generated code was reviewed, tested, and verified for correctness and security."
  }
}
```
