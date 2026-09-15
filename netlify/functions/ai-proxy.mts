/**
 * ─────────────────────────────────────────────────────────────────
 *  AI Proxy Serverless Function (Netlify)
 * ─────────────────────────────────────────────────────────────────
 *
 *  Secure server-side gateway for routing AI requests from the frontend
 *  to local or remote AI runtimes (Ollama / vLLM / private model endpoints).
 *
 *  Security Hardening:
 *  - Verifies Supabase authentication token.
 *  - Path whitelisting: Rejects any arbitrary path / path-traversal attacks.
 *  - Model validation: Enforces that requests only target registered models.
 *  - Sanitizes error responses: Never leaks internal infrastructure IPs or hostnames.
 *  - Injects server-side credentials (e.g. VLLM_API_KEY) without exposing them to browser bundles.
 */

import { Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

let supabaseClient: any = null;

function getSupabase() {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase configuration is missing.");
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

const ALLOWED_ORIGINS = [
  "https://relearn-ai.netlify.app",
  "https://relearn.ai",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8888",
];

// Whitelist of allowed runtime paths to prevent open proxy / SSRF vulnerabilities
const ALLOWED_OLLAMA_PATHS = ["/api/chat", "/api/tags"];
const ALLOWED_VLLM_PATHS = ["/chat/completions", "/models", "/health"];
const ALLOWED_HF_PATHS = ["/chat/completions", "/models"];

export default async (req: Request, context: Context) => {
  const origin = req.headers.get("origin") || "";
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  const corsHeaders = {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-ai-runtime",
    "Access-Control-Allow-Credentials": "true",
  };

  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  // 🔐 1. Authentication Check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized: Missing authorization token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return new Response(JSON.stringify({ error: "Authentication service configuration error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized: Empty token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 🌐 2. Target Runtime & Path Whitelisting
  const url = new URL(req.url);
  let cleanPath = url.searchParams.get("path") || url.pathname.replace(/^\/api\/ai/, "");
  if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;

  const isOllama = cleanPath.startsWith("/ollama");
  const isVllm = cleanPath.startsWith("/vllm");
  const isHf = cleanPath.startsWith("/hf");

  let targetBaseUrl = "";
  let targetApiKey = "";
  let subPath = "";

  if (isOllama) {
    targetBaseUrl = process.env.AI_OLLAMA_SERVER_URL || process.env.AI_OLLAMA_BASE_URL || "http://localhost:11434";
    subPath = cleanPath.replace(/^\/ollama/, "");
    if (!subPath.startsWith("/")) subPath = "/" + subPath;

    if (!ALLOWED_OLLAMA_PATHS.includes(subPath)) {
      return new Response(JSON.stringify({ error: "Forbidden: Endpoint not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else if (isVllm) {
    targetBaseUrl = process.env.AI_VLLM_SERVER_URL || process.env.AI_VLLM_BASE_URL || "http://localhost:8000/v1";
    targetApiKey = process.env.VLLM_API_KEY || "";
    subPath = cleanPath.replace(/^\/vllm(\/v1)?/, "");
    if (!subPath.startsWith("/")) subPath = "/" + subPath;

    if (!ALLOWED_VLLM_PATHS.includes(subPath)) {
      return new Response(JSON.stringify({ error: "Forbidden: Endpoint not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else if (isHf) {
    targetBaseUrl = process.env.AI_HF_SERVER_URL || process.env.HF_BASE_URL || "https://router.huggingface.co/v1";
    targetApiKey = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY || "";
    subPath = cleanPath.replace(/^\/hf(\/v1)?/, "");
    if (!subPath.startsWith("/")) subPath = "/" + subPath;

    if (!ALLOWED_HF_PATHS.includes(subPath)) {
      return new Response(JSON.stringify({ error: "Forbidden: Endpoint not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    return new Response(JSON.stringify({ error: "Forbidden: Unrecognized AI runtime destination" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const targetEndpoint = `${targetBaseUrl.replace(/\/+$/, "")}${subPath}`;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (targetApiKey) {
    requestHeaders["Authorization"] = `Bearer ${targetApiKey}`;
  }

  // 🚀 3. Forward Request to Validated Runtime Endpoint
  try {
    const rawBody = req.method !== "GET" ? await req.text() : undefined;

    // Optional JSON payload validation for model enforcement
    if (rawBody && (subPath === "/api/chat" || subPath === "/chat/completions")) {
      try {
        const parsed = JSON.parse(rawBody);
        const requestedModel = String(parsed.model || "").toLowerCase();
        const isAllowedModel =
          requestedModel.includes("qwen") ||
          requestedModel.includes("gemma") ||
          requestedModel.includes("instruct");

        if (!isAllowedModel && requestedModel) {
          return new Response(
            JSON.stringify({ error: "Forbidden: Model not permitted on this gateway" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } catch {
        // Body is not valid JSON
        return new Response(JSON.stringify({ error: "Bad Request: Invalid JSON body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const response = await fetch(targetEndpoint, {
      method: req.method,
      headers: requestHeaders,
      body: rawBody,
    });

    const contentType = response.headers.get("Content-Type") || "application/json";

    // Forward streaming responses directly
    if (
      contentType.includes("text/event-stream") ||
      contentType.includes("application/x-ndjson") ||
      contentType.includes("application/json")
    ) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          ...corsHeaders,
        },
      });
    }

    const responseText = await response.text();
    return new Response(responseText, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        ...corsHeaders,
      },
    });
  } catch {
    // Return sanitized error without exposing internal backend URLs or IPs
    return new Response(
      JSON.stringify({ error: "AI runtime is currently unreachable. Please try again later." }),
      {
        status: 503,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};
