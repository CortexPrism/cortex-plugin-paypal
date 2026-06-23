# Changelog


## [1.0.1] — 2026-06-22

### Changed

- Migrated to CortexPrism v0.51.0 plugin API
- Renamed `ToolResult` → `ToolCallResult` to match SDK types
- Switched type imports from local `types.ts` to `cortex/plugins` module
- Updated `peerDependencies.cortex` to `>=0.51.0`
- Standardized UI settings: `default` → `defaultValue`, `enum` → `options` for select fields
- All code passes `deno fmt` and `deno lint`
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project setup

## [1.0.0] — 2026-06-18

### Added

- Initial release of cortex-plugin-paypal
- **Orders** (4 tools): `paypal_create_order`, `paypal_capture_order`,
  `paypal_show_order`, `paypal_refund_capture`
- **Invoices** (3 tools): `paypal_list_invoices`, `paypal_create_invoice`,
  `paypal_show_invoice`
- **Payouts** (1 tool): `paypal_create_payout` (batch payments to multiple
  recipients)
- **Products** (2 tools): `paypal_list_products`, `paypal_create_product`
- **Subscriptions** (2 tools): `paypal_list_plans`, `paypal_create_subscription`
- OAuth 2.0 authentication via `auth.ts` with automatic token refresh
- PayPal environment support (sandbox/live)
- All tools include input validation, error handling, and structured logging
- Comprehensive test suite for all validation paths

### Security

- All API requests use HTTPS only
- OAuth tokens are never logged
- Input validation on all parameters prevents injection
- Credentials handled via secure plugin config
