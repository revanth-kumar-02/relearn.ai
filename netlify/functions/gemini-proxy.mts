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

  // @ts-ignore
  const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").trim();
  
  if (!apiKey) {
    console.error("[gemini-proxy] API key missing");
    return new Response(JSON.stringify({ error: "Server Configuration Error" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(req.url);
    // The incoming path looks like: /api/gemini/v1beta/models/gemini-1.5-flash:generateContent
    // We want to keep everything after /api/gemini
    const cleanPath = url.pathname.replace('/api/gemini', '');
    
    // Construct the destination URL
    const googleEndpoint = `https://generativelanguage.googleapis.com${cleanPath}?key=${apiKey}`;

    // Read the body once
    const requestBody = (req.method !== 'GET' && req.method !== 'HEAD') ? await req.text() : undefined;

    // Forward the request to Google
    const response = await fetch(googleEndpoint, {
      method: req.method,
      headers: {
        'Content-Type': req.headers.get('Content-Type') || 'application/json',
      },
      body: requestBody
    });

    const responseText = await response.text();

    return new Response(responseText, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });

  } catch (error: any) {
    console.error("[gemini-proxy] Proxy error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
