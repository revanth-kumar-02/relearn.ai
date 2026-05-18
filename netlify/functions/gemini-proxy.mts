import { Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

let supabaseClient: any = null;

function getSupabase() {
  if (supabaseClient) return supabaseClient;
  
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables (SUPABASE_URL / VITE_SUPABASE_URL and SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY) are missing in the Netlify environment.");
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

const ALLOWED_ORIGINS = [
  "https://relearn-ai.netlify.app",
  "https://relearn.ai",
  "http://localhost:5173",
  "http://localhost:8888"
];

export default async (req: Request, context: Context) => {
  const origin = req.headers.get("origin") || "";
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  const corsHeaders = {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-gemini-use-case, x-goog-api-key",
    "Access-Control-Allow-Credentials": "true",
  };

  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: corsHeaders,
    });
  }

  // 🔐 Authentication Check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized: Missing token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err: any) {
    console.error("[gemini-proxy] Configuration Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.error("[gemini-proxy] Auth Error:", authError?.message);
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const useCase = req.headers.get("x-gemini-use-case") || "default";

  // Select the appropriate key based on use case
  let useCaseKey = "";
  if (useCase === "plan") {
    useCaseKey = (process.env.GEMINI_PLAN_API_KEY || process.env.VITE_GEMINI_PLAN_API_KEY || "").trim();
  } else if (useCase === "chat") {
    useCaseKey = (process.env.GEMINI_CHAT_API_KEY || process.env.VITE_GEMINI_CHAT_API_KEY || "").trim();
  } else if (useCase === "image") {
    useCaseKey = (process.env.GEMINI_IMAGE_API_KEY || process.env.VITE_GEMINI_IMAGE_API_KEY || "").trim();
  } else if (useCase === "learning") {
    useCaseKey = (process.env.GEMINI_LEARNING_API_KEY || process.env.VITE_GEMINI_LEARNING_API_KEY || "").trim();
  }

  const primaryKey = (
    process.env.GEMINI_API_KEY || 
    process.env.VITE_GEMINI_API_KEY || 
    ""
  ).trim();

  // Create a list of keys to try. Primary key acts as a fallback for exhausted or invalid use-case keys.
  const keysToTry = [useCaseKey, primaryKey].filter(k => k && k !== "PROXY_KEY_MANAGED_BY_SERVER" && k !== "your_api_key_here");
  
  // Deduplicate keys
  const uniqueKeys = [...new Set(keysToTry)];

  if (uniqueKeys.length === 0) {
    console.error(`[gemini-proxy] Deployment Error: No valid API keys found for useCase: ${useCase}.`);
    return new Response(JSON.stringify({
      error: "API Key Configuration Error. Please check your .env or Netlify settings.",
      useCase
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(req.url);
  // Remove /api/gemini prefix and ensure the path starts with a single slash
  let cleanPath = url.searchParams.get('path') || url.pathname.replace(/^\/api\/gemini/, '');
  if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;

  // Track the last response to return if all keys fail
  let lastResponse: Response | null = null;
  const requestBodyText = (req.method !== 'GET' && req.method !== 'HEAD') ? await req.text() : undefined;

  for (const apiKey of uniqueKeys) {
    try {
      const googleEndpoint = new URL(`https://generativelanguage.googleapis.com${cleanPath}`);
      googleEndpoint.searchParams.set('key', apiKey);

      console.log(`[gemini-proxy] [Attempt] ${req.method} to Google with key prefix ${apiKey.substring(0, 6)}... for useCase: ${useCase}`);

      const response = await fetch(googleEndpoint.toString(), {
        method: req.method,
        headers: {
          'Content-Type': req.headers.get('Content-Type') || 'application/json',
          // Also send key in header for extra redundancy
          'x-goog-api-key': apiKey,
        },
        body: requestBodyText
      });

      const responseText = await response.text();

      // If successful or a non-retryable error, return immediately
      // 429 (Rate Limit) and 403 (Invalid Key/Quota issues) are retryable with a different key
      if (response.ok || (response.status !== 429 && response.status !== 403)) {
        return new Response(responseText, {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": response.headers.get("Content-Type") || "application/json",
            "X-Proxy-Debug-Key-Prefix": apiKey.substring(0, 6),
            "X-Proxy-Attempt-Success": "true"
          },
        });
      }

      console.warn(`[gemini-proxy] Key ${apiKey.substring(0, 6)} failed with status ${response.status}. Trying next available key...`);
      lastResponse = new Response(responseText, { 
        status: response.status, 
        headers: {
          ...corsHeaders,
          "Content-Type": response.headers.get("Content-Type") || "application/json",
          "X-Proxy-Failed-Key": `${apiKey.substring(0, 6)}...${apiKey.slice(-4)}`
        }
      });

    } catch (error: any) {
      console.error(`[gemini-proxy] Fatal error with key ${apiKey.substring(0, 6)}:`, error);
      // Continue to next key if fetch itself failed (network issue)
    }
  }

  // If we reach here, all keys failed. Return the last response received.
  if (lastResponse) {
    return lastResponse;
  }

  return new Response(JSON.stringify({ error: "All available API keys failed to return a response." }), {
    status: 500,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
};
