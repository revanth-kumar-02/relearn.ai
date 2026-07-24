/**
 * Centralized Secure API Client wrapper.
 * Provides timeout, retry, authorization header injection, and normalized error responses.
 */

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  authToken?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  code?: string;
  data?: T;
  status?: number;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number = 500, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Execute a secure fetch request with timeout and automatic retry logic.
 */
export async function secureFetch<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    timeoutMs = 15000,
    retries = 2,
    retryDelayMs = 1000,
    authToken,
    headers: customHeaders = {},
    ...fetchOptions
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
          const body = await response.json();
          if (body && body.message) {
            errorMsg = body.message;
          }
        } catch {
          // Response body was not JSON
        }

        // Retry on 5xx server errors
        if (response.status >= 500 && attempt < retries) {
          attempt++;
          await new Promise((res) => setTimeout(res, retryDelayMs * attempt));
          continue;
        }

        return {
          success: false,
          message: errorMsg,
          status: response.status,
        };
      }

      // Successful response parsing
      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      return {
        success: true,
        data,
        status: response.status,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      if (err.name === 'AbortError') {
        return {
          success: false,
          message: `Request timed out after ${timeoutMs}ms`,
          status: 408,
        };
      }

      if (attempt < retries) {
        attempt++;
        await new Promise((res) => setTimeout(res, retryDelayMs * attempt));
      } else {
        break;
      }
    }
  }

  return {
    success: false,
    message: lastError?.message || 'Network request failed',
    status: 500,
  };
}

export const apiClient = {
  get: <T = any>(url: string, options?: ApiRequestOptions) =>
    secureFetch<T>(url, { ...options, method: 'GET' }),
  post: <T = any>(url: string, body?: any, options?: ApiRequestOptions) =>
    secureFetch<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T = any>(url: string, body?: any, options?: ApiRequestOptions) =>
    secureFetch<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(url: string, options?: ApiRequestOptions) =>
    secureFetch<T>(url, { ...options, method: 'DELETE' }),
};
