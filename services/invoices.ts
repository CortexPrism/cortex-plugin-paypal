/**
 * PayPal Invoicing — create, list, and show invoices.
 */

import type { PluginContext, Tool, ToolResult } from "cortex/plugins";
import {
  durationMs,
  getPayPalConfig,
  handleResponse,
  paypalFetch,
} from "../auth.ts";

export const paypalListInvoicesTool: Tool = {
  definition: {
    name: "paypal_list_invoices",
    description: "List PayPal invoices with optional status filter",
    params: [
      {
        name: "status",
        type: "string",
        description: "Filter by status: DRAFT, SENT, PAID, etc.",
        required: false,
      },
      {
        name: "page_size",
        type: "number",
        description: "Results per page (1-100, default 20)",
        required: false,
      },
      {
        name: "page",
        type: "number",
        description: "Page number (default 1)",
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
      const config = getPayPalConfig(ctx.config);
      const pageSize = Math.min(
        Math.max(typeof args.page_size === "number" ? args.page_size : 20, 1),
        100,
      );
      const page = Math.max(typeof args.page === "number" ? args.page : 1, 1);
      const status = args.status as string | undefined;

      const params = new URLSearchParams({
        page_size: String(pageSize),
        page: String(page),
      });
      if (status) params.set("status", status);

      const response = await paypalFetch(
        `/v2/invoicing/invoices?${params.toString()}`,
        { method: "GET" },
        config,
      );

      return await handleResponse("paypal_list_invoices", response, start);
    } catch (error) {
      return {
        toolName: "paypal_list_invoices",
        success: false,
        output: "",
        error: error instanceof Error ? error.message : String(error),
        durationMs: durationMs(start),
      };
    }
  },
};

export const paypalCreateInvoiceTool: Tool = {
  definition: {
    name: "paypal_create_invoice",
    description: "Create and send a PayPal invoice",
    params: [
      {
        name: "recipient_email",
        type: "string",
        description: "Recipient email address",
        required: true,
      },
      {
        name: "recipient_name",
        type: "string",
        description: "Recipient full name",
        required: true,
      },
      {
        name: "amount",
        type: "string",
        description: 'Invoice total (e.g., "99.99")',
        required: true,
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
        description: "Note/message to the recipient",
        required: false,
      },
      {
        name: "send",
        type: "boolean",
        description: "Send invoice immediately (default: true)",
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
      const recipientEmail = args.recipient_email;
      const recipientName = args.recipient_name;
      const amount = args.amount;

      if (!recipientEmail || typeof recipientEmail !== "string") {
        return {
          toolName: "paypal_create_invoice",
          success: false,
          output: "",
          error: "recipient_email must be a non-empty string",
          durationMs: durationMs(start),
        };
      }
      if (!recipientName || typeof recipientName !== "string") {
        return {
          toolName: "paypal_create_invoice",
          success: false,
          output: "",
          error: "recipient_name must be a non-empty string",
          durationMs: durationMs(start),
        };
      }
      if (!amount || typeof amount !== "string" || isNaN(parseFloat(amount))) {
        return {
          toolName: "paypal_create_invoice",
          success: false,
          output: "",
          error: "amount must be a valid number string",
          durationMs: durationMs(start),
        };
      }

      const config = getPayPalConfig(ctx.config);
      const currency = (args.currency as string) || "USD";
      const note = (args.note as string) || "";
      const sendInvoice = args.send !== false;

      const body = {
        detail: {
          currency_code: currency,
          note,
          invoice_number: `INV-${Date.now()}`,
        },
        invoicer: {
          email_address: config.clientId, // placeholder; sender info from PayPal profile
        },
        primary_recipients: [{
          billing_info: {
            email_address: recipientEmail,
            name: { full_name: recipientName },
          },
        }],
        items: [{
          name: "Invoice",
          quantity: 1,
          unit_amount: { currency_code: currency, value: amount },
        }],
        configuration: {
          partial_payment: { allow_partial_payment: false },
          allow_tip: false,
          tax_calculated_after_discount: false,
          template_id: "",
        },
        amount: {
          breakdown: {
            item_total: { currency_code: currency, value: amount },
          },
        },
      };

      // Create the invoice
      const createResponse = await paypalFetch("/v2/invoicing/invoices", {
        method: "POST",
        body: JSON.stringify(body),
      }, config);

      if (!createResponse.ok) {
        return await handleResponse(
          "paypal_create_invoice",
          createResponse,
          start,
        );
      }

      const invoice = await createResponse.json() as { id?: string };

      // Send the invoice if requested
      if (sendInvoice && invoice.id) {
        const sendResponse = await paypalFetch(
          `/v2/invoicing/invoices/${encodeURIComponent(invoice.id)}/send`,
          { method: "POST" },
          config,
        );

        if (!sendResponse.ok) {
          return await handleResponse(
            "paypal_create_invoice",
            sendResponse,
            start,
          );
        }
      }

      return {
        toolName: "paypal_create_invoice",
        success: true,
        output: JSON.stringify(
          {
            invoice_id: invoice.id,
            status: sendInvoice ? "SENT" : "DRAFT",
            recipient: recipientEmail,
            amount,
            currency,
          },
          null,
          2,
        ),
        durationMs: durationMs(start),
      };
    } catch (error) {
      return {
        toolName: "paypal_create_invoice",
        success: false,
        output: "",
        error: error instanceof Error ? error.message : String(error),
        durationMs: durationMs(start),
      };
    }
  },
};

export const paypalShowInvoiceTool: Tool = {
  definition: {
    name: "paypal_show_invoice",
    description: "Get details of a PayPal invoice by ID",
    params: [
      {
        name: "invoice_id",
        type: "string",
        description: "PayPal invoice ID",
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
      const invoiceId = args.invoice_id;
      if (!invoiceId || typeof invoiceId !== "string") {
        return {
          toolName: "paypal_show_invoice",
          success: false,
          output: "",
          error: "invoice_id must be a non-empty string",
          durationMs: durationMs(start),
        };
      }

      const config = getPayPalConfig(ctx.config);
      const response = await paypalFetch(
        `/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}`,
        { method: "GET" },
        config,
      );

      return await handleResponse("paypal_show_invoice", response, start);
    } catch (error) {
      return {
        toolName: "paypal_show_invoice",
        success: false,
        output: "",
        error: error instanceof Error ? error.message : String(error),
        durationMs: durationMs(start),
      };
    }
  },
};

export const invoicesTools: Tool[] = [
  paypalListInvoicesTool,
  paypalCreateInvoiceTool,
  paypalShowInvoiceTool,
];
