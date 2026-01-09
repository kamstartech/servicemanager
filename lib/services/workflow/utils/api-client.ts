import { ExecutionContext } from '../types/handler-types';
import { resolveVariables, getNestedValue, setNestedValue } from './variable-resolver';

/**
 * Utility for making API calls during workflow execution
 */

export interface APICallConfig {
  method?: string;
  headers?: Record<string, string>;
  parameterMapping?: Record<string, string>;
  timeout?: number;
}

export interface APICallResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Make an API call with variable resolution and timeout
 */
export async function makeAPICall(
  endpoint: string,
  config: APICallConfig,
  context: ExecutionContext,
  input: any,
  timeoutMs: number = 30000
): Promise<APICallResult> {
  try {
    // Resolve variables in endpoint
    const resolvedEndpoint = resolveVariables(endpoint, context, input);

    // Build request body from parameter mapping if configured
    let requestBody = input;
    if (config.parameterMapping && Object.keys(config.parameterMapping).length > 0) {
      requestBody = buildRequestFromMapping(
        config.parameterMapping,
        context.variables
      );
    }

    // Make request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(resolvedEndpoint, {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': context.userId,
          'X-Session-Id': context.sessionId,
          ...config.headers
        },
        body: requestBody ? JSON.stringify(requestBody) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeout);

      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: responseData.error || responseData.message || `HTTP ${response.status}`
        };
      }

      return {
        success: true,
        data: responseData
      };

    } catch (fetchError: any) {
      clearTimeout(timeout);
      throw fetchError;
    }

  } catch (error: any) {
    return {
      success: false,
      error: error.name === 'AbortError' ? 'Request timeout' : error.message
    };
  }
}

/**
 * Build request body from parameter mapping
 */
export function buildRequestFromMapping(
  mapping: Record<string, string>,
  contextData: any
): any {
  const result: any = {};

  for (const [paramPath, dataPath] of Object.entries(mapping)) {
    if (!dataPath) continue; // Skip empty mappings

    const value = getNestedValue(contextData, dataPath);
    if (value !== undefined) {
      setNestedValue(result, paramPath, value);
    }
  }

  return result;
}

/**
 * Submit data to API endpoint
 */
export async function submitToAPI(
  endpoint: string,
  data: any,
  config: APICallConfig = {},
  timeoutMs: number = 30000
): Promise<any> {
  if (!endpoint) {
    throw new Error('API endpoint not configured');
  }

  const response = await fetch(endpoint, {
    method: config.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers
    },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(timeoutMs)
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || responseData.message || 'API submission failed');
  }

  return responseData;
}

/**
 * Map context data to API format using field mapping
 */
export function mapContextToAPI(
  mapping: Record<string, string>,
  context: any
): any {
  if (!mapping || Object.keys(mapping).length === 0) {
    // No mapping configured, return context as-is
    return context;
  }

  const mapped: any = {};

  for (const [targetField, sourcePath] of Object.entries(mapping)) {
    const value = getNestedValue(context, sourcePath as string);
    if (value !== undefined) {
      mapped[targetField] = value;
    }
  }

  return mapped;
}
