/**
 * CortexPrism PayPal Plugin
 *
 * Integrate PayPal payments, invoicing, payouts, products,
 * and subscriptions via the PayPal REST API.
 *
 * ## Authentication
 *
 * 1. Go to https://developer.paypal.com/dashboard/applications
 * 2. Create a REST API app to get your Client ID and Secret
 * 3. Use Sandbox credentials for development, Live for production
 * 4. Configure in plugin settings
 *
 * ## Configuration
 *
 * ```json
 * {
 *   "plugins": {
 *     "cortex-plugin-paypal": {
 *       "enabled": true,
 *       "config": {
 *         "paypalClientId": "YOUR_CLIENT_ID",
 *         "paypalClientSecret": "YOUR_CLIENT_SECRET",
 *         "paypalEnvironment": "sandbox"
 *       }
 *     }
 *   }
 * }
 * ```
 */

import type { PluginContext, Tool } from "cortex/plugins";
import { ordersTools } from "./services/orders.ts";
import { invoicesTools } from "./services/invoices.ts";
import { payoutsTools } from "./services/payouts.ts";
import { productsTools } from "./services/products.ts";
import { subscriptionsTools } from "./services/subscriptions.ts";

export async function onLoad(ctx: PluginContext): Promise<void> {
  await ctx.logger.info("[cortex-plugin-paypal] Loading PayPal plugin");

  const paypal = await ctx.config.get<Record<string, unknown>>("paypal") || {};
  if (paypal.paypalClientId && paypal.paypalClientSecret) {
    await ctx.logger.info(
      `[cortex-plugin-paypal] Configured for ${
        paypal.paypalEnvironment || "sandbox"
      } environment`,
    );
  } else {
    await ctx.logger.warn(
      "[cortex-plugin-paypal] Not configured. Set paypalClientId and paypalClientSecret.",
    );
  }

  await ctx.logger.info(
    `[cortex-plugin-paypal] Loaded ${tools.length} tools: orders, invoices, payouts, products, subscriptions`,
  );
}

export function onUnload(_ctx: PluginContext): void {
  // No cleanup needed
}

/**
 * All exported tools — 14 tools across 5 service groups:
 *
 * **Orders:**   paypal_create_order, paypal_capture_order, paypal_show_order, paypal_refund_capture
 * **Invoices:** paypal_list_invoices, paypal_create_invoice, paypal_show_invoice
 * **Payouts:**  paypal_create_payout
 * **Products:** paypal_list_products, paypal_create_product
 * **Plans:**    paypal_list_plans, paypal_create_subscription
 */
export const tools: Tool[] = [
  ...ordersTools,
  ...invoicesTools,
  ...payoutsTools,
  ...productsTools,
  ...subscriptionsTools,
];
