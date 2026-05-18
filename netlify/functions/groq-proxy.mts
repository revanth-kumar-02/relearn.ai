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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
    console.error("[groq-proxy] Configuration Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.error("[groq-proxy] Auth Error:", authError?.message);
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = (process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || "").trim();

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Groq API Key not configured." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(req.url);
  // Get path from query parameter (injected by netlify.toml splat) or fallback to pathname
  let cleanPath = url.searchParams.get('path') || url.pathname.replace(/^\/api\/groq/, '');
  if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;

  const groqEndpoint = `https://api.groq.com/openai/v1${cleanPath}`;

  try {
    const response = await fetch(groqEndpoint, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: req.method !== 'GET' ? await req.text() : undefined,
    });

    // Handle streaming vs non-streaming response
    if (response.headers.get("Content-Type")?.includes("text/event-stream")) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": corsHeaders["Access-Control-Allow-Origin"],
          ...corsHeaders
        },
      });
    }

    const responseText = await response.text();

    return new Response(responseText, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": corsHeaders["Access-Control-Allow-Origin"],
        ...corsHeaders
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};
