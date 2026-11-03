# Relearn.ai AI Pipeline & Runtime Architecture

## 1. Overview & Architecture

Relearn.ai uses a clean, provider-independent AI architecture that strictly isolates application features from low-level LLM providers and execution runtimes.

```
Feature Service (Learning Plan, Chatbot, Flashcards, etc.)
               │
               ▼
           AI Router (generateAI, generateStreamAI)
               │
               ▼
       Task Configuration (Strict Task ➔ Canonical Model Mapping)
               │
               ▼
         Model Registry (Capabilities, Context Windows, Defaults)
               │
               ▼
       Provider Selection (Centralized via AI_PROVIDER)
               │
               ▼
     AIInferenceProvider Adapter Interface
   ┌───────────┬──────────────┬──────────────┬────────┐
   ▼           ▼              ▼              ▼        ▼
 Ollama       vLLM      Hugging Face       Mock    [Future]
   │           │              │              │
   ▼           ▼              ▼              ▼
Local Dev   GPU Cluster   Hosted API   Test/Sim
```

---

## 2. Canonical Model Assignments

Tasks are strictly bound to canonical model definitions. The feature caller never chooses an arbitrary model.

| Task | Canonical Model Identity | Primary Responsibilities |
| :--- | :--- | :--- |
| `learning_plan` | `Qwen3-Next-80B-A3B-Instruct` | Multi-day structured curriculum generation |
| `learning_space` | `Qwen3-Next-80B-A3B-Instruct` | Deep-dive synthesis, study guides, and workspace notes |
| `cheat_sheet` | `Qwen3-Next-80B-A3B-Instruct` | High-density formula, syntax, and concept distillation |
| `chatbot` | `Gemma-3-27B` | Real-time conversational tutoring & Socratic guidance |
| `flashcards` | `Gemma-3-27B` | Active-recall front/back card generation |
| `quizzes` | `Gemma-3-27B` | Multiple-choice & conceptual assessment generation |
| `concept_collision` | `Gemma-3-27B` | Creative cross-domain analogy generation |

---

## 3. Supported Inference Providers

### A. Ollama (`ollama`)
- **Use Case**: Local developer testing and offline experimentation.
- **Protocol**: Ollama Native HTTP API (`/api/chat`, `/api/tags`).
- **Streaming**: Native NDJSON streaming format.
- **Runtime Identifiers**: `Qwen3-Next-80B-A3B-Instruct`, `Gemma-3-27B`.

### B. vLLM (`vllm`)
- **Use Case**: Self-hosted GPU instances (RunPod, AWS EC2, on-prem clusters).
- **Protocol**: OpenAI-compatible chat completions (`/v1/chat/completions`).
- **Streaming**: Server-Sent Events (SSE) `data: {...}\n\n` with `stream_options: { include_usage: true }`.
- **Runtime Identifiers**: `Qwen3-Next-80B-A3B-Instruct`, `Gemma-3-27B`.

### C. Groq (`groq`) & OpenRouter (`openrouter`)
- **Use Case**: Production cloud inference with automatic fallback resilience.
- **Protocol**: OpenAI-compatible chat completions (`/v1/chat/completions`).
- **Primary Model**: `openai/gpt-oss-120b` via Groq.
- **Fast Model**: `openai/gpt-oss-20b` via Groq.
- **Free Fallback Model**: `openai/gpt-oss-120b:free` via OpenRouter.

### D. Mock (`mock`)
- **Use Case**: Automated unit testing, CI pipelines, and benchmark simulation without network overhead.

---

## 4. Environment Variables & Security Boundary

To protect credentials and internal infrastructure, configuration is strictly split into **client-safe** and **server-only** variables.

### Client-Safe Variables (`VITE_*`)
These are bundled into the browser application and must **NEVER** contain private API keys.

```env
# Active provider selection ('groq' | 'openrouter' | 'ollama' | 'vllm' | 'mock')
VITE_AI_PROVIDER=groq

# Base proxy URLs (relative paths routed through Netlify function or Vite dev server)
VITE_AI_GROQ_BASE_URL=/api/groq
VITE_AI_OPENROUTER_BASE_URL=/api/openrouter
VITE_AI_OLLAMA_BASE_URL=/api/ai/ollama
VITE_AI_VLLM_BASE_URL=/api/ai/vllm/v1

# Request timeout
VITE_AI_TIMEOUT_MS=60000

# Local runtime model tag overrides
VITE_AI_MODEL_QWEN=Qwen3-Next-80B-A3B-Instruct
VITE_AI_MODEL_GEMMA=Gemma-3-27B
```

### Server-Only Variables (Netlify Functions / Backend Environment)
These are stored securely on the server and are **NEVER** exposed to client bundles:

```env
# Primary Groq API Key
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenRouter Fallback API Key
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxx

# vLLM Cluster Access Token (if secured)
VLLM_API_KEY=secret_vllm_cluster_token

# Upstream Backend URLs
AI_OLLAMA_SERVER_URL=http://localhost:11434
AI_VLLM_SERVER_URL=https://my-gpu-cluster.internal/v1

# Supabase JWT Auth Verification
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Security Gateway (`netlify/functions/ai-proxy.mts`)
All browser requests pass through `/api/ai/*`, which enforces:
1. **Supabase JWT verification**: Rejects unauthenticated requests.
2. **Endpoint whitelisting**: Only `/chat/completions`, `/api/chat`, `/models`, `/health` are permitted.
3. **Model whitelisting**: Only registered Qwen and Gemma model requests are forwarded.
4. **Credential injection**: Injects `HF_API_KEY` or `VLLM_API_KEY` on the server.
5. **Error sanitization**: Strips internal hostnames, IPs, and API keys before sending error responses to the client.

---

## 5. Benchmarking & Model Evaluation

The benchmark runner ([src/services/ai/pipeline/benchmark.ts](file:///home/rev/My_Personal_Space/Projects/Finished/relearn.ai/src/services/ai/pipeline/benchmark.ts)) accurately distinguishes between providers and runtime endpoints:

```typescript
export interface BenchmarkRunMetric {
  readonly promptId: string;
  readonly task: AITask;
  readonly canonicalModel: AIModelId;
  readonly modelId: string;
  readonly actualRuntimeModelIdentifier: string;
  readonly provider: string;
  readonly latencyMs: number;
  readonly timeToFirstTokenMs?: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly tokensPerSecond: number;
  readonly finishReason: AIFinishReason;
  readonly success: boolean;
  readonly error?: string;
  readonly outputPreview: string;
  readonly generatedResponse: string;
}
```

This enables isolated, reproducible comparisons between:
- `openai/gpt-oss-120b` via **Groq** vs `openai/gpt-oss-120b:free` via **OpenRouter**
- `openai/gpt-oss-20b` via **Groq** vs `openai/gpt-oss-20b:free` via **OpenRouter**

---

## 6. How to Configure Providers

### To configure Groq (Primary):
```bash
# In .env
GROQ_API_KEY=gsk_your_key_here
AI_PRIMARY_PROVIDER=groq
VITE_AI_PROVIDER=groq
```

### To configure OpenRouter (Fallback):
```bash
# In .env
OPENROUTER_API_KEY=sk-or-your_key_here
AI_FALLBACK_PROVIDER=openrouter
AI_FALLBACK_ENABLED=true
```

### To switch to vLLM (Self-Hosted GPU):
```bash
# In .env (Server)
AI_VLLM_SERVER_URL=https://your-vllm-cluster:8000/v1
VLLM_API_KEY=your_optional_vllm_key
AI_PROVIDER=vllm

# In .env (Client)
VITE_AI_PROVIDER=vllm
```

### To switch to Ollama (Local Dev):
```bash
# In .env (Client & Server)
AI_PROVIDER=ollama
VITE_AI_PROVIDER=ollama
```
