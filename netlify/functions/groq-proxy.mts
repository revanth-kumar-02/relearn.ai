import { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
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
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const responseText = await response.text();

    return new Response(responseText, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*" }
    });
  }
};
