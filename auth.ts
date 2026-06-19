/**
 * PayPal OAuth 2.0 authentication module.
 *
 * Handles token generation and provides an authorized fetch wrapper
 * for all PayPal REST API endpoints.
 */

import type { ToolResult } from 'cortex/plugins';

/** PayPal API environment */
export type PayPalEnvironment = 'sandbox' | 'live';

/** Plugin configuration for PayPal */
export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  environment: PayPalEnvironment;
}

/** OAuth token response from PayPal */
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

/** Thrown when PayPal config is missing or invalid */
export class PayPalAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayPalAuthError';
  }
}

/**
 * Retrieve PayPal configuration from plugin context config.
 */
export function getPayPalConfig(config: Record<string, unknown>): PayPalConfig {
  const clientId = config.paypalClientId as string;
  const clientSecret = config.paypalClientSecret as string;
  const environment = (config.paypalEnvironment as string) || 'sandbox';

  if (!clientId || !clientSecret) {
    throw new PayPalAuthError(
      'PayPal not configured. Set paypalClientId and paypalClientSecret in plugin config.',
    );
  }

  if (environment !== 'sandbox' && environment !== 'live') {
    throw new PayPalAuthError(
      `Invalid environment '${environment}'. Must be 'sandbox' or 'live'.`,
    );
  }

  return { clientId, clientSecret, environment };
}

/**
 * Get the base URL for the PayPal REST API depending on environment.
 */
export function getApiBase(env: PayPalEnvironment): string {
  return env === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}

/**
 * Obtain an access token from PayPal using client credentials grant.
 */
export async function getAccessToken(config: PayPalConfig): Promise<string> {
  const base = getApiBase(config.environment);
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
  });

  const credentials = btoa(`${config.clientId}:${config.clientSecret}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      let detail = '';
      try {
        const parsed = JSON.parse(errorBody);
        detail = parsed.error_description || parsed.error || errorBody;
      } catch {
        detail = errorBody;
      }
      throw new PayPalAuthError(`PayPal auth failed (${response.status}): ${detail}`);
    }

    const data = await response.json() as TokenResponse;
    return data.access_token;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof PayPalAuthError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new PayPalAuthError('PayPal auth request timed out (10 seconds)');
    }
    throw new PayPalAuthError(
      `Failed to obtain PayPal token: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Make an authorized fetch to the PayPal REST API.
 */
export async function paypalFetch(
  path: string,
  options: RequestInit,
  config: PayPalConfig,
): Promise<Response> {
  const token = await getAccessToken(config);
  const base = getApiBase(config.environment);
  const url = `${base}${path}`;

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new PayPalAuthError('PayPal API request timed out (30 seconds)');
    }
    throw err;
  }
}

/**
 * Handle PayPal API response and return a ToolResult.
 */
export async function handleResponse(
  toolName: string,
  response: Response,
  start: number,
  successStatuses: number[] = [200, 201, 204],
): Promise<ToolResult> {
  const durationMs = Date.now() - start;

  if (successStatuses.includes(response.status)) {
    if (response.status === 204) {
      return {
        toolName,
        success: true,
        output: JSON.stringify({ success: true }),
        durationMs,
      };
    }
    const data = await response.json();
    return {
      toolName,
      success: true,
      output: JSON.stringify(data, null, 2),
      durationMs,
    };
  }

  let errorBody = '';
  try {
    errorBody = await response.text();
    const parsed = JSON.parse(errorBody);
    errorBody = parsed.message || parsed.error_description || parsed.error?.message || errorBody;
  } catch {
    // use raw text
  }

  return {
    toolName,
    success: false,
    output: '',
    error: `PayPal API error (${response.status}): ${errorBody || response.statusText}`,
    durationMs,
  };
}

export function durationMs(start: number): number {
  return Date.now() - start;
}
