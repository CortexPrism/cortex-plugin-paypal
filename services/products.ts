/**
 * PayPal Catalog Products — list and create products.
 */

import type { PluginContext, Tool, ToolResult } from 'cortex/plugins';
import { durationMs, getPayPalConfig, handleResponse, paypalFetch } from '../auth.ts';

export const paypalListProductsTool: Tool = {
  definition: {
    name: 'paypal_list_products',
    description: 'List PayPal catalog products',
    params: [
      {
        name: 'page_size',
        type: 'number',
        description: 'Results per page (1-100, default 20)',
        required: false,
      },
      { name: 'page', type: 'number', description: 'Page number (default 1)', required: false },
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

      const params = new URLSearchParams({
        page_size: String(pageSize),
        page: String(page),
      });

      const response = await paypalFetch(
        `/v1/catalogs/products?${params.toString()}`,
        { method: 'GET' },
        config,
      );

      return await handleResponse('paypal_list_products', response, start);
    } catch (error) {
      return {
        toolName: 'paypal_list_products',
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        durationMs: durationMs(start),
      };
    }
  },
};

export const paypalCreateProductTool: Tool = {
  definition: {
    name: 'paypal_create_product',
    description: 'Create a PayPal catalog product',
    params: [
      { name: 'name', type: 'string', description: 'Product name', required: true },
      { name: 'description', type: 'string', description: 'Product description', required: false },
      {
        name: 'type',
        type: 'string',
        description: 'Product type: PHYSICAL, DIGITAL, SERVICE (default: DIGITAL)',
        required: false,
      },
      {
        name: 'category',
        type: 'string',
        description: 'Product category (e.g., SOFTWARE, ELECTRONICS)',
        required: false,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, ctx: PluginContext): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const name = args.name;
      if (!name || typeof name !== 'string') {
        return {
          toolName: 'paypal_create_product',
          success: false,
          output: '',
          error: 'name must be a non-empty string',
          durationMs: durationMs(start),
        };
      }

      const config = getPayPalConfig(ctx.config);
      const productType = (args.type as string) || 'DIGITAL';
      const description = (args.description as string) || '';
      const category = args.category as string | undefined;

      if (!['PHYSICAL', 'DIGITAL', 'SERVICE'].includes(productType)) {
        return {
          toolName: 'paypal_create_product',
          success: false,
          output: '',
          error: 'type must be PHYSICAL, DIGITAL, or SERVICE',
          durationMs: durationMs(start),
        };
      }

      const body: Record<string, unknown> = {
        name,
        type: productType,
      };
      if (description) body.description = description;
      if (category) body.category = category;

      const response = await paypalFetch('/v1/catalogs/products', {
        method: 'POST',
        body: JSON.stringify(body),
      }, config);

      return await handleResponse('paypal_create_product', response, start);
    } catch (error) {
      return {
        toolName: 'paypal_create_product',
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        durationMs: durationMs(start),
      };
    }
  },
};

export const productsTools: Tool[] = [
  paypalListProductsTool,
  paypalCreateProductTool,
];
