/**
 * PayPal Subscriptions — list billing plans and create subscriptions.
 */

import type { PluginContext, Tool, ToolResult } from 'cortex/plugins';
import { durationMs, getPayPalConfig, handleResponse, paypalFetch } from '../auth.ts';

export const paypalListPlansTool: Tool = {
  definition: {
    name: 'paypal_list_plans',
    description: 'List PayPal billing plans (subscription plans)',
    params: [
      {
        name: 'page_size',
        type: 'number',
        description: 'Results per page (1-100, default 20)',
        required: false,
      },
      { name: 'page', type: 'number', description: 'Page number (default 1)', required: false },
      {
        name: 'status',
        type: 'string',
        description: 'Filter by status: ACTIVE, INACTIVE, CREATED',
        required: false,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, ctx: PluginContext): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const config = getPayPalConfig(ctx.config);
      const pageSize = Math.min(
        Math.max(typeof args.page_size === 'number' ? args.page_size : 20, 1),
        100,
      );
      const page = Math.max(typeof args.page === 'number' ? args.page : 1, 1);
      const status = args.status as string | undefined;

      const params = new URLSearchParams({
        page_size: String(pageSize),
        page: String(page),
      });
      if (status) params.set('status', status);

      const response = await paypalFetch(
        `/v1/billing/plans?${params.toString()}`,
        { method: 'GET' },
        config,
      );

      return await handleResponse('paypal_list_plans', response, start);
    } catch (error) {
      return {
        toolName: 'paypal_list_plans',
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        durationMs: durationMs(start),
      };
    }
  },
};

export const paypalCreateSubscriptionTool: Tool = {
  definition: {
    name: 'paypal_create_subscription',
    description: 'Create a PayPal subscription for a plan',
    params: [
      { name: 'plan_id', type: 'string', description: 'PayPal billing plan ID', required: true },
      {
        name: 'subscriber_email',
        type: 'string',
        description: 'Subscriber email address',
        required: false,
      },
      {
        name: 'subscriber_name',
        type: 'string',
        description: 'Subscriber full name',
        required: false,
      },
      { name: 'quantity', type: 'number', description: 'Quantity (default: 1)', required: false },
      {
        name: 'return_url',
        type: 'string',
        description: 'URL to redirect after approval',
        required: false,
      },
      {
        name: 'cancel_url',
        type: 'string',
        description: 'URL to redirect on cancellation',
        required: false,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, ctx: PluginContext): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const planId = args.plan_id;
      if (!planId || typeof planId !== 'string') {
        return {
          toolName: 'paypal_create_subscription',
          success: false,
          output: '',
          error: 'plan_id must be a non-empty string',
          durationMs: durationMs(start),
        };
      }

      const config = getPayPalConfig(ctx.config);
      const subscriberEmail = args.subscriber_email as string | undefined;
      const subscriberName = args.subscriber_name as string | undefined;
      const quantity = Math.max(typeof args.quantity === 'number' ? args.quantity : 1, 1);
      const returnUrl = (args.return_url as string) || 'https://example.com/success';
      const cancelUrl = (args.cancel_url as string) || 'https://example.com/cancel';

      const body: Record<string, unknown> = {
        plan_id: planId,
        quantity,
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          user_action: 'SUBSCRIBE_NOW',
        },
      };

      if (subscriberEmail || subscriberName) {
        body.subscriber = {};
        if (subscriberEmail) {
          (body.subscriber as Record<string, unknown>).email_address = subscriberEmail;
        }
        if (subscriberName) {
          (body.subscriber as Record<string, unknown>).name = { given_name: subscriberName };
        }
      }

      const response = await paypalFetch('/v1/billing/subscriptions', {
        method: 'POST',
        body: JSON.stringify(body),
      }, config);

      return await handleResponse('paypal_create_subscription', response, start);
    } catch (error) {
      return {
        toolName: 'paypal_create_subscription',
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        durationMs: durationMs(start),
      };
    }
  },
};

export const subscriptionsTools: Tool[] = [
  paypalListPlansTool,
  paypalCreateSubscriptionTool,
];
