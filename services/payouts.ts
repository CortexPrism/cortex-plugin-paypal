/**
 * PayPal Payouts — send payments to multiple recipients.
 */

import type { PluginContext, Tool, ToolResult } from "cortex/plugins";
import {
  durationMs,
  getPayPalConfig,
  handleResponse,
  paypalFetch,
} from "../auth.ts";

export const paypalCreatePayoutTool: Tool = {
  definition: {
    name: "paypal_create_payout",
    description: "Send a PayPal payout to one or more recipients",
    params: [
      {
        name: "recipients",
        type: "string",
        description:
          'JSON array of recipients. Each: {"email":"...","amount":"...","note":"..."}',
        required: true,
      },
      {
        name: "email_subject",
        type: "string",
        description: "Subject of the payout notification email",
        required: false,
      },
      {
        name: "email_message",
        type: "string",
        description: "Message in the payout notification email",
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
      const recipientsRaw = args.recipients;
      if (!recipientsRaw || typeof recipientsRaw !== "string") {
        return {
          toolName: "paypal_create_payout",
          success: false,
          output: "",
          error: "recipients must be a non-empty JSON string",
          durationMs: durationMs(start),
        };
      }

      let recipients: { email: string; amount: string; note?: string }[];
      try {
        recipients = JSON.parse(recipientsRaw);
      } catch {
        return {
          toolName: "paypal_create_payout",
          success: false,
          output: "",
          error: "recipients is not valid JSON",
          durationMs: durationMs(start),
        };
      }

      if (!Array.isArray(recipients) || recipients.length === 0) {
        return {
          toolName: "paypal_create_payout",
          success: false,
          output: "",
          error: "recipients must be a non-empty array",
          durationMs: durationMs(start),
        };
      }

      for (const r of recipients) {
        if (!r.email || !r.amount) {
          return {
            toolName: "paypal_create_payout",
            success: false,
            output: "",
            error: "Each recipient must have email and amount fields",
            durationMs: durationMs(start),
          };
        }
        if (isNaN(parseFloat(r.amount))) {
          return {
            toolName: "paypal_create_payout",
            success: false,
            output: "",
            error: `Invalid amount '${r.amount}' for recipient '${r.email}'`,
            durationMs: durationMs(start),
          };
        }
      }

      const config = getPayPalConfig(ctx.config);
      const emailSubject = (args.email_subject as string) ||
        "You have a payout!";
      const emailMessage = (args.email_message as string) ||
        "You have received a payment.";

      const items = recipients.map((r) => ({
        recipient_type: "EMAIL",
        receiver: r.email,
        amount: { value: r.amount, currency: "USD" },
        note: r.note || emailMessage,
        sender_item_id: `item_${Date.now()}_${
          Math.random().toString(36).slice(2, 8)
        }`,
      }));

      const body = {
        sender_batch_header: {
          sender_batch_id: `batch_${Date.now()}`,
          email_subject: emailSubject,
          email_message: emailMessage,
        },
        items,
      };

      const response = await paypalFetch("/v1/payments/payouts", {
        method: "POST",
        body: JSON.stringify(body),
      }, config);

      return await handleResponse("paypal_create_payout", response, start);
    } catch (error) {
      return {
        toolName: "paypal_create_payout",
        success: false,
        output: "",
        error: error instanceof Error ? error.message : String(error),
        durationMs: durationMs(start),
      };
    }
  },
};

export const payoutsTools: Tool[] = [
  paypalCreatePayoutTool,
];
