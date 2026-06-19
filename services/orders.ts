/**
 * PayPal Orders — create, capture, show, and refund orders.
 */

import type { PluginContext, Tool, ToolResult } from "cortex/plugins";
import {
  durationMs,
  getPayPalConfig,
  handleResponse,
  paypalFetch,
} from "../auth.ts";

export const paypalCreateOrderTool: Tool = {
  definition: {
    name: "paypal_create_order",
    description: "Create a PayPal order for a purchase",
    params: [
      {
        name: "amount",
        type: "string",
        description: 'Order total (e.g., "25.99")',
        required: true,
      },
      {
        name: "currency",
        type: "string",
        description: "Currency code (e.g., USD, EUR, GBP)",
        required: false,
      },
      {
        name: "description",
        type: "string",
        description: "Order description / purchase unit",
        required: false,
      },
      {
        name: "intent",
        type: "string",
        description: "CAPTURE or AUTHORIZE (default: CAPTURE)",
        required: false,
      },
      {
        name: "reference",
        type: "string",
        description: "Merchant-provided invoice/order ID",
        required: false,
      },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (
    args: Record<string, unknown>,
    ctx: PluginContext,
  ): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const amount = args.amount;
      if (!amount || typeof amount !== "string") {
        return {
          toolName: "paypal_create_order",
          success: false,
          output: "",
          error: "amount must be a non-empty string",
          durationMs: durationMs(start),
        };
      }
      if (isNaN(parseFloat(amount))) {
        return {
          toolName: "paypal_create_order",
          success: false,
          output: "",
          error: `amount '${amount}' is not a valid number`,
          durationMs: durationMs(start),
        };
      }

      const config = getPayPalConfig(ctx.config);
      const currency = (args.currency as string) || "USD";
      const description = (args.description as string) || "Purchase";
      const intent = (args.intent as string) || "CAPTURE";
      const reference = args.reference as string | undefined;

      if (!["CAPTURE", "AUTHORIZE"].includes(intent)) {
        return {
          toolName: "paypal_create_order",
          success: false,
          output: "",
          error: "intent must be 'CAPTURE' or 'AUTHORIZE'",
          durationMs: durationMs(start),
        };
      }

      const body: Record<string, unknown> = {
        intent,
        purchase_units: [{
          amount: { currency_code: currency, value: amount },
          description,
        }],
      };

      if (reference) {
        body.purchase_units[0].invoice_id = reference;
      }

      const response = await paypalFetch("/v2/checkout/orders", {
        method: "POST",
        body: JSON.stringify(body),
      }, config);

      return await handleResponse("paypal_create_order", response, start);
    } catch (error) {
      return {
        toolName: "paypal_create_order",
        success: false,
        output: "",
        error: error instanceof Error ? error.message : String(error),
        durationMs: durationMs(start),
      };
    }
  },
};

export const paypalCaptureOrderTool: Tool = {
  definition: {
    name: "paypal_capture_order",
    description: "Capture payment for an approved PayPal order",
    params: [
      {
        name: "order_id",
        type: "string",
        description: "PayPal order ID to capture",
        required: true,
      },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (
    args: Record<string, unknown>,
    ctx: PluginContext,
  ): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const orderId = args.order_id;
      if (!orderId || typeof orderId !== "string") {
        return {
          toolName: "paypal_capture_order",
          success: false,
          output: "",
          error: "order_id must be a non-empty string",
          durationMs: durationMs(start),
        };
      }

      const config = getPayPalConfig(ctx.config);
      const response = await paypalFetch(
        `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
        { method: "POST" },
        config,
      );

      return await handleResponse("paypal_capture_order", response, start);
    } catch (error) {
      return {
        toolName: "paypal_capture_order",
        success: false,
        output: "",
        error: error instanceof Error ? error.message : String(error),
        durationMs: durationMs(start),
      };
    }
  },
};

export const paypalShowOrderTool: Tool = {
  definition: {
    name: "paypal_show_order",
    description: "Get details of a PayPal order",
    params: [
      {
        name: "order_id",
        type: "string",
        description: "PayPal order ID",
        required: true,
      },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (
    args: Record<string, unknown>,
    ctx: PluginContext,
  ): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const orderId = args.order_id;
      if (!orderId || typeof orderId !== "string") {
        return {
          toolName: "paypal_show_order",
          success: false,
          output: "",
          error: "order_id must be a non-empty string",
          durationMs: durationMs(start),
        };
      }

      const config = getPayPalConfig(ctx.config);
      const response = await paypalFetch(
        `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
        { method: "GET" },
        config,
      );

      return await handleResponse("paypal_show_order", response, start);
    } catch (error) {
      return {
        toolName: "paypal_show_order",
        success: false,
        output: "",
        error: error instanceof Error ? error.message : String(error),
        durationMs: durationMs(start),
      };
    }
  },
};

export const paypalRefundCaptureTool: Tool = {
  definition: {
    name: "paypal_refund_capture",
    description: "Refund a captured payment",
    params: [
      {
        name: "capture_id",
        type: "string",
        description: "PayPal capture ID to refund",
        required: true,
      },
      {
        name: "amount",
        type: "string",
        description: 'Refund amount (e.g., "10.00"). Defaults to full refund.',
        required: false,
      },
      {
        name: "currency",
        type: "string",
        description: "Currency code (default: USD)",
        required: false,
      },
      {
        name: "note",
        type: "string",
        description: "Refund reason/note to buyer",
        required: false,
      },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (
    args: Record<string, unknown>,
    ctx: PluginContext,
  ): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const captureId = args.capture_id;
      if (!captureId || typeof captureId !== "string") {
        return {
          toolName: "paypal_refund_capture",
          success: false,
          output: "",
          error: "capture_id must be a non-empty string",
          durationMs: durationMs(start),
        };
      }

      const config = getPayPalConfig(ctx.config);
      const amount = args.amount as string | undefined;
      const currency = (args.currency as string) || "USD";
      const note = args.note as string | undefined;

      const body: Record<string, unknown> = {};
      if (amount) {
        if (isNaN(parseFloat(amount))) {
          return {
            toolName: "paypal_refund_capture",
            success: false,
            output: "",
            error: `amount '${amount}' is not a valid number`,
            durationMs: durationMs(start),
          };
        }
        body.amount = { value: amount, currency_code: currency };
      }
      if (note) body.note_to_payer = note;

      const response = await paypalFetch(
        `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
        config,
      );

      return await handleResponse("paypal_refund_capture", response, start);
    } catch (error) {
      return {
        toolName: "paypal_refund_capture",
        success: false,
        output: "",
        error: error instanceof Error ? error.message : String(error),
        durationMs: durationMs(start),
      };
    }
  },
};

export const ordersTools: Tool[] = [
  paypalCreateOrderTool,
  paypalCaptureOrderTool,
  paypalShowOrderTool,
  paypalRefundCaptureTool,
];
