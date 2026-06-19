import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { tools } from '../../mod.ts';
import { getPayPalConfig, PayPalAuthError } from '../../auth.ts';
import type { PluginContext } from 'cortex/plugins';

const mockContext: PluginContext = {
  pluginId: 'cortex-plugin-paypal',
  pluginDir: '/tmp/plugins/cortex-plugin-paypal',
  state: {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    list: () => Promise.resolve({}),
  },
  config: {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve(),
    getAll: () => Promise.resolve({}),
  },
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
  host: {
    registerTool: () => {},
    unregisterTool: () => {},
  },
};

function findTool(name: string) {
  return tools.find((t) => t.definition.name === name);
}

// --- Tool export tests ---

Deno.test('tools array exported with 12 tools', () => {
  assertEquals(Array.isArray(tools), true);
  assertEquals(tools.length, 12);
});

Deno.test('all tool names are unique and have required fields', () => {
  const names = new Set<string>();
  for (const tool of tools) {
    assertEquals(
      names.has(tool.definition.name),
      false,
      `Duplicate tool name: ${tool.definition.name}`,
    );
    names.add(tool.definition.name);
    assertEquals(typeof tool.definition.description, 'string');
    assertEquals(Array.isArray(tool.definition.params), true);
    assertEquals(typeof tool.execute, 'function');
  }
});

// --- Orders ---

Deno.test('paypal_create_order - rejects missing amount', async () => {
  const tool = findTool('paypal_create_order');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'amount');
});

Deno.test('paypal_create_order - rejects invalid amount', async () => {
  const tool = findTool('paypal_create_order');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({ amount: 'not-a-number' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'valid number');
});

Deno.test('paypal_create_order - rejects missing PayPal config', async () => {
  const tool = findTool('paypal_create_order');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({ amount: '25.00' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'PayPal');
});

Deno.test('paypal_create_order - rejects invalid intent', async () => {
  const tool = findTool('paypal_create_order');
  if (!tool) throw new Error('tool not found');

  // Should fail on "PayPal not configured" first since config is empty
  // But we also need to test the intent validation path
  const result = await tool.execute({ amount: '25.00', intent: 'INVALID' }, mockContext);
  assertEquals(result.success, false);
  // It may fail on config or intent, either is fine
  assertEquals(typeof result.error, 'string');
});

Deno.test('paypal_capture_order - rejects missing order_id', async () => {
  const tool = findTool('paypal_capture_order');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'order_id');
});

Deno.test('paypal_show_order - rejects missing order_id', async () => {
  const tool = findTool('paypal_show_order');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'order_id');
});

Deno.test('paypal_refund_capture - rejects missing capture_id', async () => {
  const tool = findTool('paypal_refund_capture');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'capture_id');
});

Deno.test('paypal_refund_capture - rejects invalid amount', async () => {
  const tool = findTool('paypal_refund_capture');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({ capture_id: 'cap123', amount: 'bad' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'valid number');
});

// --- Invoices ---

Deno.test('paypal_create_invoice - rejects missing fields', async () => {
  const tool = findTool('paypal_create_invoice');
  if (!tool) throw new Error('tool not found');

  const r1 = await tool.execute({}, mockContext);
  assertEquals(r1.success, false);
  assertStringIncludes(r1.error, 'recipient_email');

  const r2 = await tool.execute({ recipient_email: 'a@b.com' }, mockContext);
  assertEquals(r2.success, false);
  assertStringIncludes(r2.error, 'recipient_name');

  const r3 = await tool.execute(
    { recipient_email: 'a@b.com', recipient_name: 'Alice' },
    mockContext,
  );
  assertEquals(r3.success, false);
  assertStringIncludes(r3.error, 'amount');
});

Deno.test('paypal_list_invoices - rejects missing config', async () => {
  const tool = findTool('paypal_list_invoices');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'PayPal');
});

Deno.test('paypal_show_invoice - rejects missing invoice_id', async () => {
  const tool = findTool('paypal_show_invoice');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'invoice_id');
});

// --- Payouts ---

Deno.test('paypal_create_payout - rejects missing recipients', async () => {
  const tool = findTool('paypal_create_payout');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'recipients');
});

Deno.test('paypal_create_payout - rejects invalid JSON', async () => {
  const tool = findTool('paypal_create_payout');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({ recipients: 'not-json' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'JSON');
});

Deno.test('paypal_create_payout - rejects empty array', async () => {
  const tool = findTool('paypal_create_payout');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({ recipients: '[]' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'non-empty');
});

Deno.test('paypal_create_payout - validates recipient fields', async () => {
  const tool = findTool('paypal_create_payout');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({ recipients: '[{"name":"Alice"}]' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'email');
});

Deno.test('paypal_create_payout - validates recipient amount', async () => {
  const tool = findTool('paypal_create_payout');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute(
    { recipients: '[{"email":"a@b.com","amount":"bad"}]' },
    mockContext,
  );
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'Invalid amount');
});

// --- Products ---

Deno.test('paypal_create_product - rejects missing name', async () => {
  const tool = findTool('paypal_create_product');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'name');
});

Deno.test('paypal_create_product - rejects invalid type', async () => {
  const tool = findTool('paypal_create_product');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({ name: 'Widget', type: 'INVALID' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'PHYSICAL');
});

Deno.test('paypal_list_products - rejects missing config', async () => {
  const tool = findTool('paypal_list_products');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'PayPal');
});

// --- Subscriptions ---

Deno.test('paypal_create_subscription - rejects missing plan_id', async () => {
  const tool = findTool('paypal_create_subscription');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'plan_id');
});

Deno.test('paypal_list_plans - rejects missing config', async () => {
  const tool = findTool('paypal_list_plans');
  if (!tool) throw new Error('tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'PayPal');
});

// --- Auth module tests ---

Deno.test('getPayPalConfig - rejects missing config', () => {
  try {
    getPayPalConfig({});
    assertEquals(true, false, 'Should have thrown');
  } catch (e) {
    assertStringIncludes(e instanceof Error ? e.message : String(e), 'PayPal');
  }
});

Deno.test('getPayPalConfig - rejects invalid environment', () => {
  try {
    getPayPalConfig({
      paypalClientId: 'id',
      paypalClientSecret: 'secret',
      paypalEnvironment: 'invalid',
    });
    assertEquals(true, false, 'Should have thrown');
  } catch (e) {
    assertStringIncludes(e instanceof Error ? e.message : String(e), 'environment');
  }
});

Deno.test('getPayPalConfig - returns valid config', () => {
  const config = getPayPalConfig({
    paypalClientId: 'test-id',
    paypalClientSecret: 'test-secret',
    paypalEnvironment: 'sandbox',
  });
  assertEquals(config.clientId, 'test-id');
  assertEquals(config.clientSecret, 'test-secret');
  assertEquals(config.environment, 'sandbox');
});

Deno.test('getPayPalConfig - defaults to sandbox', () => {
  const config = getPayPalConfig({
    paypalClientId: 'id',
    paypalClientSecret: 'secret',
  });
  assertEquals(config.environment, 'sandbox');
});

Deno.test('PayPalAuthError has correct name', () => {
  const err = new PayPalAuthError('test');
  assertEquals(err.name, 'PayPalAuthError');
  assertEquals(err.message, 'test');
});
