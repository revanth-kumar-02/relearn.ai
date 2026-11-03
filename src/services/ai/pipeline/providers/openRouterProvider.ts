/**
 * ─────────────────────────────────────────────────────────────────
 *  OpenRouter Free Fallback Inference Provider
 * ─────────────────────────────────────────────────────────────────
 *
 *  Secondary fallback adapter for OpenRouter's OpenAI-compatible API
 *  (endpoint: `https://openrouter.ai/api/v1/chat/completions`).
 *
 *  Strict Free-Tier Enforcements:
 *  - Enforces `:free` model tag (defaults to `openai/gpt-oss-120b:free`).
 *  - NEVER routes to a paid model or strips the `:free` suffix.
 *  - Provides clean normalized errors without secondary fallback loops.
 *  - Server-safe API key management (never leaks keys to browser or logs).
 */

import {
  type AIInferenceProvider,
  type AIRequest,
  type ModelDefinition,
  type ModelConfigDefaults,
  type AIResponse,
  type AIStreamChunk,
  type AIUsage,
  type AIFinishReason,
  AIRuntimeError,
  AITimeoutError,
  AIAbortError,
  AIConnectionError,
} from '../types';
import {
  getAIRuntimeConfig,
  resolveRuntimeModelName,
} from '../config/runtimeConfig';
import { getAuthHeaders } from '../../../../utils/authUtils';

export interface OpenRouterProviderOptions {
  readonly baseUrl?: string;
  readonly apiKey?: string;
  readonly defaultTimeoutMs?: number;
  readonly headers?: Record<string, string>;
}

export class OpenRouterProvider implements AIInferenceProvider {
  readonly name = 'openrouter';
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly staticHeaders: Record<string, string>;

  constructor(options?: OpenRouterProviderOptions) {
    const config = getAIRuntimeConfig();
    this.baseUrl = (options?.baseUrl || config.openRouterBaseUrl).replace(/\/+$/, '');
    this.defaultTimeoutMs = options?.defaultTimeoutMs || config.defaultTimeoutMs;

    const apiKey =
      options?.apiKey ||
      (typeof process !== 'undefined' && process.env ? process.env.OPENROUTER_API_KEY : undefined);

    this.staticHeaders = {
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://relearn.ai',
      'X-Title': 'Relearn.ai',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...(options?.headers || {}),
    };
  }

  private getMergedHeaders(): Record<string, string> {
    return {
      ...this.staticHeaders,
      ...getAuthHeaders(),
    };
  }

  /**
   * Enforces that the target model on OpenRouter is strictly a free model.
   */
  private enforceFreeModel(model: string): string {
    const trimmed = model.trim();
    if (trimmed.endsWith(':free')) {
      return trimmed;
    }
    // Hard restriction: never allow non-free models on OpenRouter fallback
    return `${trimmed}:free`;
  }

  /**
   * Generates a complete normalized response from OpenRouter free tier.
   */
  async generate(
    request: AIRequest,
    modelDef: ModelDefinition,
    effectiveConfig: ModelConfigDefaults
  ): Promise<AIResponse> {
    const timeoutMs = request.options?.timeoutMs || this.defaultTimeoutMs;
    const controller = new AbortController();
    let isTimedOut = false;

    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, timeoutMs);

    const onAbort = () => controller.abort();
    if (request.options?.signal) {
      request.options.signal.addEventListener('abort', onAbort);
    }

    const rawModel = resolveRuntimeModelName(modelDef.id, undefined, 'openrouter');
    const runtimeModel = this.enforceFreeModel(rawModel);
    const messages = this.buildMessages(request);
    const payload: Record<string, unknown> = {
      model: runtimeModel,
      messages,
      temperature: effectiveConfig.temperature,
      top_p: effectiveConfig.topP,
      max_tokens: effectiveConfig.maxTokens,
      stop: effectiveConfig.stopSequences,
      stream: false,
    };

    if (request.options?.responseFormat === 'json') {
      payload.response_format = { type: 'json_object' };
    }

    const startTime = performance.now();

    try {
      const endpoint = this.baseUrl.endsWith('/chat/completions')
        ? this.baseUrl
        : `${this.baseUrl}/chat/completions`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getMergedHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const data = await response.json();
      const endTime = performance.now();

      const choice = data.choices?.[0];
      const text = choice?.message?.content ?? '';
      const finishReason = this.mapFinishReason(choice?.finish_reason);

      const usage: AIUsage = {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      };

      return {
        text,
        model: runtimeModel,
        usage,
        finishReason,
        latencyMs: Math.round(endTime - startTime),
        metadata: {
          runtime: 'openrouter',
          runtimeModel,
          id: data.id,
          provider: 'openrouter',
        },
      };
    } catch (err: unknown) {
      this.handleFetchError(err, isTimedOut, timeoutMs);
    } finally {
      clearTimeout(timeoutId);
      if (request.options?.signal) {
        request.options.signal.removeEventListener('abort', onAbort);
      }
    }
  }

  /**
   * Generates a streaming normalized response from OpenRouter free tier via SSE.
   */
  async *generateStream(
    request: AIRequest,
    modelDef: ModelDefinition,
    effectiveConfig: ModelConfigDefaults
  ): AsyncIterable<AIStreamChunk> {
    const timeoutMs = request.options?.timeoutMs || this.defaultTimeoutMs;
    const controller = new AbortController();
    let isTimedOut = false;

    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, timeoutMs);

    const onAbort = () => controller.abort();
    if (request.options?.signal) {
      request.options.signal.addEventListener('abort', onAbort);
    }

    const rawModel = resolveRuntimeModelName(modelDef.id, undefined, 'openrouter');
    const runtimeModel = this.enforceFreeModel(rawModel);
    const messages = this.buildMessages(request);
    const payload: Record<string, unknown> = {
      model: runtimeModel,
      messages,
      stream: true,
      temperature: effectiveConfig.temperature,
      top_p: effectiveConfig.topP,
      max_tokens: effectiveConfig.maxTokens,
      stop: effectiveConfig.stopSequences,
      stream_options: { include_usage: true },
    };

    if (request.options?.responseFormat === 'json') {
      payload.response_format = { type: 'json_object' };
    }

    const startTime = performance.now();
    let accumulatedText = '';
    let timeToFirstTokenMs: number | undefined;
    let hasCompleted = false;

    try {
      const endpoint = this.baseUrl.endsWith('/chat/completions')
        ? this.baseUrl
        : `${this.baseUrl}/chat/completions`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getMergedHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      if (!response.body) {
        throw new AIRuntimeError('OpenRouter streaming response body is empty', 500);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            hasCompleted = true;
            yield {
              textDelta: '',
              accumulatedText,
              isComplete: true,
              timeToFirstTokenMs,
              finishReason: 'stop',
            };
            return;
          }

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            try {
              const chunk = JSON.parse(dataStr);
              const delta = chunk.choices?.[0]?.delta?.content ?? '';
              const finishReason = this.mapFinishReason(chunk.choices?.[0]?.finish_reason);

              if (delta) {
                if (timeToFirstTokenMs === undefined) {
                  timeToFirstTokenMs = Math.round(performance.now() - startTime);
                }
                accumulatedText += delta;

                yield {
                  textDelta: delta,
                  accumulatedText,
                  isComplete: false,
                  timeToFirstTokenMs,
                };
              }

              if (finishReason !== 'unknown' && finishReason !== 'stop') {
                yield {
                  textDelta: '',
                  accumulatedText,
                  isComplete: true,
                  timeToFirstTokenMs,
                  finishReason,
                  usage: chunk.usage
                    ? {
                        promptTokens: chunk.usage.prompt_tokens ?? 0,
                        completionTokens: chunk.usage.completion_tokens ?? 0,
                        totalTokens: chunk.usage.total_tokens ?? 0,
                      }
                    : undefined,
                };
                hasCompleted = true;
                return;
              }
            } catch {
              // Ignore partial or unparseable SSE line fragments
            }
          }
        }
      }

      if (!hasCompleted) {
        yield {
          textDelta: '',
          accumulatedText,
          isComplete: true,
          timeToFirstTokenMs,
          finishReason: 'stop',
        };
      }
    } catch (err: unknown) {
      this.handleFetchError(err, isTimedOut, timeoutMs);
    } finally {
      clearTimeout(timeoutId);
      if (request.options?.signal) {
        request.options.signal.removeEventListener('abort', onAbort);
      }
    }
  }

  private buildMessages(request: AIRequest): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    if (request.systemPrompt && request.systemPrompt.trim()) {
      messages.push({
        role: 'system',
        content: request.systemPrompt.trim(),
      });
    }

    messages.push({
      role: 'user',
      content: request.prompt.trim(),
    });

    return messages;
  }

  private mapFinishReason(reason?: string): AIFinishReason {
    if (!reason) return 'stop';
    const lower = reason.toLowerCase();
    if (lower === 'stop') return 'stop';
    if (lower === 'length') return 'length';
    if (lower === 'content_filter') return 'content_filter';
    if (lower === 'tool_calls') return 'tool_calls';
    return 'unknown';
  }

  private sanitizeErrorMessage(msg: string): string {
    return msg
      .replace(/\b(sk-or-[A-Za-z0-9_]{20,})\b/g, '[sanitized_key]')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[sanitized_ip]')
      .slice(0, 300);
  }

  private async handleHttpError(response: Response): Promise<never> {
    const errorText = await response.text().catch(() => '');
    const sanitizedError = this.sanitizeErrorMessage(errorText || response.statusText);

    if (response.status === 401) {
      throw new AIRuntimeError(
        'OpenRouter authentication failed (HTTP 401). Please check server-side OPENROUTER_API_KEY configuration.',
        401
      );
    }

    if (response.status === 402) {
      throw new AIRuntimeError(
        `OpenRouter free model endpoint requires payment/credit unexpectedly (HTTP 402): ${sanitizedError}`,
        402
      );
    }

    if (response.status === 403) {
      throw new AIRuntimeError(
        `OpenRouter access forbidden (HTTP 403): ${sanitizedError}`,
        403
      );
    }

    if (response.status === 404) {
      throw new AIRuntimeError(
        `OpenRouter free model endpoint not found or retired (HTTP 404): ${sanitizedError}`,
        404
      );
    }

    if (response.status === 408) {
      throw new AIRuntimeError(
        `OpenRouter request timed out (HTTP 408): ${sanitizedError}`,
        408
      );
    }

    if (response.status === 429) {
      throw new AIRuntimeError(
        'OpenRouter free model rate limit or capacity exceeded (HTTP 429). Please try again later.',
        429
      );
    }

    if (response.status >= 500) {
      throw new AIRuntimeError(
        `OpenRouter server error (HTTP ${response.status}): ${sanitizedError}`,
        response.status
      );
    }

    throw new AIRuntimeError(
      `OpenRouter runtime error (HTTP ${response.status}): ${sanitizedError}`,
      response.status
    );
  }

  private handleFetchError(err: unknown, isTimedOut: boolean, timeoutMs: number): never {
    if (isTimedOut) {
      throw new AITimeoutError(timeoutMs);
    }
    if (err instanceof AIRuntimeError) {
      throw err;
    }
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new AIAbortError();
      }
      if (
        err.message.toLowerCase().includes('failed to fetch') ||
        err.message.toLowerCase().includes('fetch failed') ||
        err.message.toLowerCase().includes('network') ||
        err.message.toLowerCase().includes('econnrefused')
      ) {
        throw new AIConnectionError(
          'Failed to connect to OpenRouter AI runtime service. Ensure network connectivity or proxy is reachable.'
        );
      }
      throw new AIRuntimeError(this.sanitizeErrorMessage(err.message));
    }
    throw new AIRuntimeError(this.sanitizeErrorMessage(String(err)));
  }
}
