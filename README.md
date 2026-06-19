# CortexPrism PayPal Plugin

Integrate PayPal payments, invoicing, payouts, products, and subscriptions into
your Cortex agents via the PayPal REST API.

## Features

| Service              | Tools | What You Can Do                             |
| -------------------- | ----- | ------------------------------------------- |
| 💳 **Orders**        | 4     | Create, capture, show, and refund orders    |
| 📄 **Invoices**      | 3     | List, create, and view invoices             |
| 💸 **Payouts**       | 1     | Send payments to multiple recipients        |
| 📦 **Products**      | 2     | List and create catalog products            |
| 🔄 **Subscriptions** | 2     | List billing plans and create subscriptions |

**Total: 12 tools** across 5 PayPal services.

## Installation

```bash
# From marketplace
cortex plugin install marketplace:cortex-plugin-paypal

# From GitHub
cortex plugin install github:CortexPrism/cortex-plugin-paypal

# Local development
cortex plugin install ./manifest.json
```

## Prerequisites

1. **PayPal Developer Account** at
   [developer.paypal.com](https://developer.paypal.com)
2. Create a **REST API App** in the
   [Dashboard](https://developer.paypal.com/dashboard/applications)
3. Get your **Client ID** and **Client Secret**
4. Use **Sandbox** credentials for testing, **Live** for production

## Configuration

```json
{
  "plugins": {
    "cortex-plugin-paypal": {
      "enabled": true,
      "config": {
        "paypalClientId": "YOUR_CLIENT_ID",
        "paypalClientSecret": "YOUR_CLIENT_SECRET",
        "paypalEnvironment": "sandbox"
      }
    }
  }
}
```

| Field                | Type   | Required | Description                              |
| -------------------- | ------ | -------- | ---------------------------------------- |
| `paypalClientId`     | string | Yes      | PayPal REST API Client ID                |
| `paypalClientSecret` | string | Yes      | PayPal REST API Client Secret            |
| `paypalEnvironment`  | string | No       | `sandbox` or `live` (default: `sandbox`) |

## Quick Start

```bash
# List tools
cortex tools list | grep paypal

# Create an order
cortex tool call paypal_create_order '{"amount": "25.99", "description": "Widget purchase"}'

# List products
cortex tool call paypal_list_products '{"page_size": 10}'

# Send a payout
cortex tool call paypal_create_payout '{
  "recipients": "[{\"email\":\"user@example.com\",\"amount\":\"50.00\"}]"
}'

# Use in chat
cortex chat --plugin cortex-plugin-paypal
```

## Tool Reference

### Orders

#### `paypal_create_order`

Create a PayPal order for a purchase.

**Parameters:**

- `amount` (string, required) — Order total (e.g., `"25.99"`)
- `currency` (string, optional, default: `USD`) — Currency code
- `description` (string, optional) — Order description
- `intent` (string, optional, default: `CAPTURE`) — `CAPTURE` or `AUTHORIZE`
- `reference` (string, optional) — Merchant-provided reference ID

#### `paypal_capture_order`

Capture payment for an approved order.

**Parameters:**

- `order_id` (string, required) — PayPal order ID

#### `paypal_show_order`

Get details of a PayPal order.

**Parameters:**

- `order_id` (string, required) — PayPal order ID

#### `paypal_refund_capture`

Refund a captured payment.

**Parameters:**

- `capture_id` (string, required) — Capture ID to refund
- `amount` (string, optional) — Partial refund amount (defaults to full)
- `currency` (string, optional, default: `USD`)
- `note` (string, optional) — Refund note to buyer

### Invoices

#### `paypal_list_invoices`

List PayPal invoices.

**Parameters:**

- `status` (string, optional) — Filter: `DRAFT`, `SENT`, `PAID`
- `page_size` (number, optional, default: 20)
- `page` (number, optional, default: 1)

#### `paypal_create_invoice`

Create and optionally send an invoice.

**Parameters:**

- `recipient_email` (string, required)
- `recipient_name` (string, required)
- `amount` (string, required)
- `currency` (string, optional, default: `USD`)
- `note` (string, optional)
- `send` (boolean, optional, default: true) — Send immediately

#### `paypal_show_invoice`

Get invoice details by ID.

**Parameters:**

- `invoice_id` (string, required)

### Payouts

#### `paypal_create_payout`

Send payments to multiple recipients.

**Parameters:**

- `recipients` (string, required) — JSON array of
  `{"email":"...","amount":"...","note":"..."}`
- `email_subject` (string, optional)
- `email_message` (string, optional)

### Products

#### `paypal_list_products`

List catalog products.

**Parameters:**

- `page_size` (number, optional, default: 20)
- `page` (number, optional, default: 1)

#### `paypal_create_product`

Create a catalog product.

**Parameters:**

- `name` (string, required)
- `description` (string, optional)
- `type` (string, optional, default: `DIGITAL`) — `PHYSICAL`, `DIGITAL`, or
  `SERVICE`
- `category` (string, optional) — e.g., `SOFTWARE`

### Subscriptions

#### `paypal_list_plans`

List billing/subscription plans.

**Parameters:**

- `page_size` (number, optional, default: 20)
- `page` (number, optional, default: 1)
- `status` (string, optional) — `ACTIVE`, `INACTIVE`, `CREATED`

#### `paypal_create_subscription`

Create a subscription for a plan.

**Parameters:**

- `plan_id` (string, required)
- `subscriber_email` (string, optional)
- `subscriber_name` (string, optional)
- `quantity` (number, optional, default: 1)
- `return_url` (string, optional)
- `cancel_url` (string, optional)

## Permissions

- `tools` — Provides 12 PayPal tools
- `network:fetch` — Makes HTTPS requests to PayPal REST API

## Development

```bash
deno task test
deno fmt
deno lint
deno task validate
```

## Project Structure

```
cortex-plugin-paypal/
├── manifest.json           # 12 tool definitions
├── mod.ts                  # Entry point
├── auth.ts                 # PayPal OAuth token management
├── services/
│   ├── orders.ts           # Order management (create, capture, show, refund)
│   ├── invoices.ts         # Invoice management (list, create, show)
│   ├── payouts.ts          # Payouts (send to recipients)
│   ├── products.ts         # Catalog products (list, create)
│   └── subscriptions.ts    # Billing plans and subscriptions
├── test/unit/mod.test.ts   # Tests
├── README.md               # This file
└── CHANGELOG.md            # Version history
```

## License

MIT
