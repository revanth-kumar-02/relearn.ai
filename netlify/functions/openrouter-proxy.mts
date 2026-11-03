import { Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { initServerSentry, captureServerException } from "./utils/sentry";

initServerSentry();

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

export default async (req: Request, context: Context) => {
  const origin = req.headers.get("origin") || "";
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  const corsHeaders = {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: corsHeaders,
    });
  }

  // 🔐 1. Authentication Check
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
    console.error("[openrouter-proxy] Configuration Error:", err.message);
    await captureServerException(err, { functionName: 'openrouter-proxy', statusCode: 500 });
    return new Response(JSON.stringify({ error: "Service configuration error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.error("[openrouter-proxy] Auth Error:", authError?.message);
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 🔑 2. Server-side API key check
  const apiKey = (process.env.OPENROUTER_API_KEY || "").trim();

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OpenRouter API Key not configured on server." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  let cleanPath = url.searchParams.get("path") || url.pathname.replace(/^\/api\/openrouter/, "");
  if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;

  // Enforce chat/completions or models paths only
  if (cleanPath !== "/chat/completions" && cleanPath !== "/models") {
    return new Response(JSON.stringify({ error: "Forbidden endpoint" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let requestBody: string | undefined = undefined;

  if (req.method !== "GET") {
    const rawText = await req.text();
    try {
      const parsed = JSON.parse(rawText);
      // STRICT FREE TIER ENFORCEMENT: Model must end with :free
      if (parsed.model && typeof parsed.model === "string") {
        if (!parsed.model.endsWith(":free")) {
          parsed.model = `${parsed.model}:free`;
        }
      } else {
        parsed.model = "openai/gpt-oss-120b:free";
      }
      requestBody = JSON.stringify(parsed);
    } catch {
      requestBody = rawText;
    }
  }

  const openRouterEndpoint = `https://openrouter.ai/api/v1${cleanPath}`;

  try {
    const response = await fetch(openRouterEndpoint, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://relearn.ai",
        "X-Title": "Relearn.ai",
      },
      body: requestBody,
    });

    if (response.headers.get("Content-Type")?.includes("text/event-stream")) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
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
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[openrouter-proxy] Fetch Error:", error.message);
    await captureServerException(error, { functionName: 'openrouter-proxy', statusCode: 503 });
    return new Response(JSON.stringify({ error: "OpenRouter proxy connection error." }), {
      status: 503,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};
