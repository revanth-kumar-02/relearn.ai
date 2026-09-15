/**
 * ─────────────────────────────────────────────────────────────────
 *  Hugging Face Inference Provider
 * ─────────────────────────────────────────────────────────────────
 *
 *  Production & hosted inference adapter for Hugging Face Inference API /
 *  OpenAI-compatible router protocol (e.g. `/v1/chat/completions`).
 *
 *  Supports:
 *  - Non-streaming generation with latency & token usage tracking
 *  - Real SSE streaming generation with TTFT (Time to First Token) measurement
 *  - System prompts, temperature, max_tokens, stop sequences
 *  - AbortSignal cancellation and configurable timeouts
 *  - Normalized error handling (401 Auth, 403 Forbidden/Gated, 429 Rate Limits, 503 Loading)
 *  - Server-safe API key management (never leaks credentials to client)
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

export interface HuggingFaceProviderOptions {
  readonly baseUrl?: string;
  readonly apiKey?: string;
  readonly defaultTimeoutMs?: number;
  readonly headers?: Record<string, string>;
}

export class HuggingFaceProvider implements AIInferenceProvider {
  readonly name = 'huggingface';
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly staticHeaders: Record<string, string>;

  constructor(options?: HuggingFaceProviderOptions) {
    const config = getAIRuntimeConfig();
    this.baseUrl = (options?.baseUrl || config.hfBaseUrl).replace(/\/+$/, '');
    this.defaultTimeoutMs = options?.defaultTimeoutMs || config.defaultTimeoutMs;
    const apiKey =
      options?.apiKey ||
      (typeof process !== 'undefined' && process.env
        ? process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY
        : undefined);

    this.staticHeaders = {
      'Content-Type': 'application/json',
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
   * Generates a complete normalized response from Hugging Face Inference API.
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

    const runtimeModel = resolveRuntimeModelName(modelDef.id, undefined, 'huggingface');
    const messages = this.buildMessages(request);
    const payload: Record<string, unknown> = {
      model: runtimeModel,
      messages,
      stream: false,
      temperature: effectiveConfig.temperature,
      top_p: effectiveConfig.topP,
      max_tokens: effectiveConfig.maxTokens,
      stop: effectiveConfig.stopSequences,
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
      const text = choice?.message?.content || '';
      const promptTokens = data.usage?.prompt_tokens || 0;
      const completionTokens = data.usage?.completion_tokens || 0;
      const totalTokens =
        data.usage?.total_tokens || promptTokens + completionTokens;

      const usage: AIUsage = {
        promptTokens,
        completionTokens,
        totalTokens,
      };

      const finishReason: AIFinishReason = this.mapFinishReason(choice?.finish_reason);

      return {
        text,
        model: modelDef.id,
        usage,
        finishReason,
        latencyMs: Math.round(endTime - startTime),
        metadata: {
          runtime: 'huggingface',
          runtimeModel,
          id: data.id,
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
   * Generates a streaming normalized response from Hugging Face Inference API (SSE).
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

    const runtimeModel = resolveRuntimeModelName(modelDef.id, undefined, 'huggingface');
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
        throw new AIRuntimeError('Hugging Face streaming response body is empty');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const parsed = this.parseSSELine(line, startTime, accumulatedText, timeToFirstTokenMs, hasCompleted);
          if (parsed) {
            accumulatedText = parsed.accumulatedText;
            if (parsed.timeToFirstTokenMs !== undefined && timeToFirstTokenMs === undefined) {
              timeToFirstTokenMs = parsed.timeToFirstTokenMs;
            }
            if (parsed.chunk.isComplete) {
              hasCompleted = true;
            }
            yield parsed.chunk;
          }
        }
      }

      // Process any trailing line in buffer
      if (buffer.trim()) {
        const parsed = this.parseSSELine(buffer.trim(), startTime, accumulatedText, timeToFirstTokenMs, hasCompleted);
        if (parsed) {
          yield parsed.chunk;
        }
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

  /**
   * Health check to determine if Hugging Face runtime/proxy endpoint is reachable.
   */
  async isHealthy(): Promise<boolean> {
    try {
      const endpoint = this.baseUrl.replace(/\/chat\/completions$/, '').replace(/\/v1$/, '');
      const res = await fetch(`${endpoint}/models`, {
        method: 'GET',
        headers: this.getMergedHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private parseSSELine(
    line: string,
    startTime: number,
    currentAccumulated: string,
    existingTTFT?: number,
    alreadyCompleted = false
  ): { chunk: AIStreamChunk; accumulatedText: string; timeToFirstTokenMs?: number } | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(':')) return null;

    if (!trimmed.startsWith('data:')) return null;

    const dataStr = trimmed.slice(5).trim();
    if (dataStr === '[DONE]') {
      if (alreadyCompleted) return null;
      return {
        chunk: {
          textDelta: '',
          accumulatedText: currentAccumulated,
          isComplete: true,
          timeToFirstTokenMs: existingTTFT,
          finishReason: 'stop',
        },
        accumulatedText: currentAccumulated,
        timeToFirstTokenMs: existingTTFT,
      };
    }

    try {
      const chunk = JSON.parse(dataStr);
      const choice = chunk.choices?.[0];
      const delta = choice?.delta?.content || '';
      let ttft = existingTTFT;

      if (delta.length > 0 && ttft === undefined) {
        ttft = Math.round(performance.now() - startTime);
      }

      const newAccumulated = currentAccumulated + delta;
      const isComplete = Boolean(choice?.finish_reason);

      const chunkUsage: AIUsage | undefined = chunk.usage
        ? {
            promptTokens: chunk.usage.prompt_tokens || 0,
            completionTokens: chunk.usage.completion_tokens || 0,
            totalTokens:
              chunk.usage.total_tokens ||
              (chunk.usage.prompt_tokens || 0) +
                (chunk.usage.completion_tokens || 0),
          }
        : undefined;

      const finishReason = choice?.finish_reason
        ? this.mapFinishReason(choice.finish_reason)
        : undefined;

      return {
        chunk: {
          textDelta: delta,
          accumulatedText: newAccumulated,
          isComplete,
          timeToFirstTokenMs: ttft,
          usage: chunkUsage,
          finishReason,
        },
        accumulatedText: newAccumulated,
        timeToFirstTokenMs: ttft,
      };
    } catch {
      return null;
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
      .replace(/\b(hf_[A-Za-z0-9_]{20,})\b/g, '[sanitized_key]')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[sanitized_ip]')
      .slice(0, 300);
  }

  private async handleHttpError(response: Response): Promise<never> {
    const errorText = await response.text().catch(() => '');
    const sanitizedError = this.sanitizeErrorMessage(errorText || response.statusText);

    if (response.status === 401) {
      throw new AIRuntimeError(
        'Hugging Face authentication failed (HTTP 401). Please check server-side HF_API_KEY configuration.',
        401
      );
    }

    if (response.status === 403) {
      throw new AIRuntimeError(
        `Hugging Face access forbidden (HTTP 403). Gated model terms agreement or repository permissions may be required: ${sanitizedError}`,
        403
      );
    }

    if (response.status === 429) {
      throw new AIRuntimeError(
        'Hugging Face rate limit exceeded (HTTP 429). Please reduce request frequency or upgrade compute capacity.',
        429
      );
    }

    if (response.status === 503) {
      throw new AIRuntimeError(
        `Hugging Face model is currently loading or unavailable (HTTP 503): ${sanitizedError}`,
        503
      );
    }

    throw new AIRuntimeError(
      `Hugging Face runtime error (HTTP ${response.status}): ${sanitizedError}`,
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
          'Failed to connect to Hugging Face AI runtime service. Ensure network connectivity or proxy is reachable.'
        );
      }
      throw new AIRuntimeError(this.sanitizeErrorMessage(err.message));
    }
    throw new AIRuntimeError(this.sanitizeErrorMessage(String(err)));
  }
}
