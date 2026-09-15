/**
 * ─────────────────────────────────────────────────────────────────
 *  Ollama Inference Provider
 * ─────────────────────────────────────────────────────────────────
 *
 *  Local development runtime adapter for Ollama.
 *  Communicates via Ollama's native `/api/chat` endpoint.
 *  Supports non-streaming and true NDJSON streaming generation,
 *  system prompts, temperature, top_p, num_predict, cancellation,
 *  timeout handling, and token usage extraction.
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

export interface OllamaProviderOptions {
  readonly baseUrl?: string;
  readonly defaultTimeoutMs?: number;
  readonly headers?: Record<string, string>;
}

export class OllamaProvider implements AIInferenceProvider {
  readonly name = 'ollama';
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly staticHeaders: Record<string, string>;

  constructor(options?: OllamaProviderOptions) {
    const config = getAIRuntimeConfig();
    this.baseUrl = (options?.baseUrl || config.ollamaBaseUrl).replace(/\/+$/, '');
    this.defaultTimeoutMs = options?.defaultTimeoutMs || config.defaultTimeoutMs;
    this.staticHeaders = {
      'Content-Type': 'application/json',
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
   * Generates a complete normalized response from Ollama.
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

    const runtimeModel = resolveRuntimeModelName(modelDef.id);
    const messages = this.buildMessages(request);
    const payload = {
      model: runtimeModel,
      messages,
      stream: false,
      ...(request.options?.responseFormat === 'json' ? { format: 'json' } : {}),
      options: {
        temperature: effectiveConfig.temperature,
        top_p: effectiveConfig.topP,
        top_k: effectiveConfig.topK,
        num_predict: effectiveConfig.maxTokens,
        stop: effectiveConfig.stopSequences,
      },
    };

    const startTime = performance.now();

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: this.getMergedHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new AIRuntimeError(
          `Ollama error (HTTP ${response.status}): ${this.sanitizeErrorMessage(errorText || response.statusText)}`,
          response.status
        );
      }

      const data = await response.json();
      const endTime = performance.now();

      const text = data.message?.content || '';
      const promptTokens = data.prompt_eval_count || 0;
      const completionTokens = data.eval_count || 0;
      const totalTokens = promptTokens + completionTokens;

      const usage: AIUsage = {
        promptTokens,
        completionTokens,
        totalTokens,
      };

      const finishReason: AIFinishReason = this.mapFinishReason(data.done_reason);

      return {
        text,
        model: modelDef.id,
        usage,
        finishReason,
        latencyMs: Math.round(endTime - startTime),
        metadata: {
          runtime: 'ollama',
          runtimeModel,
          totalDurationNs: data.total_duration,
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
   * Generates a streaming normalized response from Ollama (NDJSON).
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

    const runtimeModel = resolveRuntimeModelName(modelDef.id);
    const messages = this.buildMessages(request);
    const payload = {
      model: runtimeModel,
      messages,
      stream: true,
      ...(request.options?.responseFormat === 'json' ? { format: 'json' } : {}),
      options: {
        temperature: effectiveConfig.temperature,
        top_p: effectiveConfig.topP,
        top_k: effectiveConfig.topK,
        num_predict: effectiveConfig.maxTokens,
        stop: effectiveConfig.stopSequences,
      },
    };

    const startTime = performance.now();
    let accumulatedText = '';
    let timeToFirstTokenMs: number | undefined;

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: this.getMergedHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new AIRuntimeError(
          `Ollama streaming error (HTTP ${response.status}): ${this.sanitizeErrorMessage(errorText || response.statusText)}`,
          response.status
        );
      }

      if (!response.body) {
        throw new AIRuntimeError('Ollama streaming response body is empty');
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
          const chunkResult = this.parseNDJSONLine(line, startTime, accumulatedText, timeToFirstTokenMs);
          if (chunkResult) {
            accumulatedText = chunkResult.accumulatedText;
            if (chunkResult.timeToFirstTokenMs !== undefined && timeToFirstTokenMs === undefined) {
              timeToFirstTokenMs = chunkResult.timeToFirstTokenMs;
            }
            yield chunkResult.chunk;
          }
        }
      }

      // Process any trailing line in buffer
      if (buffer.trim()) {
        const chunkResult = this.parseNDJSONLine(buffer.trim(), startTime, accumulatedText, timeToFirstTokenMs);
        if (chunkResult) {
          yield chunkResult.chunk;
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
   * Health check to determine if Ollama runtime is reachable.
   */
  async isHealthy(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: this.getMergedHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private parseNDJSONLine(
    line: string,
    startTime: number,
    currentAccumulated: string,
    existingTTFT?: number
  ): { chunk: AIStreamChunk; accumulatedText: string; timeToFirstTokenMs?: number } | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    try {
      const chunk = JSON.parse(trimmed);
      const delta = chunk.message?.content || '';
      let ttft = existingTTFT;

      if (delta.length > 0 && ttft === undefined) {
        ttft = Math.round(performance.now() - startTime);
      }

      const newAccumulated = currentAccumulated + delta;
      const isComplete = Boolean(chunk.done);

      const chunkUsage: AIUsage | undefined = isComplete
        ? {
            promptTokens: chunk.prompt_eval_count || 0,
            completionTokens: chunk.eval_count || 0,
            totalTokens:
              (chunk.prompt_eval_count || 0) + (chunk.eval_count || 0),
          }
        : undefined;

      const finishReason = isComplete
        ? this.mapFinishReason(chunk.done_reason)
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

  private mapFinishReason(doneReason?: string): AIFinishReason {
    if (!doneReason) return 'stop';
    const lower = doneReason.toLowerCase();
    if (lower === 'stop') return 'stop';
    if (lower === 'length') return 'length';
    if (lower === 'load') return 'stop';
    return 'unknown';
  }

  private sanitizeErrorMessage(msg: string): string {
    // Strip private internal IPs or socket paths
    return msg.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[sanitized_ip]').slice(0, 200);
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
          'Failed to connect to AI runtime service. Ensure runtime is running.'
        );
      }
      throw new AIRuntimeError(this.sanitizeErrorMessage(err.message));
    }
    throw new AIRuntimeError(this.sanitizeErrorMessage(String(err)));
  }
}
