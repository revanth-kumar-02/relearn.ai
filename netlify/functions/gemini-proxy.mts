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

  // Ensure we have server-side keys
  const apiKey = Netlify.env.get("GEMINI_API_KEY") || Netlify.env.get("VITE_GEMINI_API_KEY");
  
  if (!apiKey) {
    console.error("[gemini-proxy] GEMINI_API_KEY missing");
    return new Response(JSON.stringify({ error: "Server Configuration Error" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Reconstruct the Google API URL
    // The incoming URL from the frontend will look like: 
    // /api/gemini/v1alpha/models/gemini-pro:generateContent
    const url = new URL(req.url);
    const path = url.pathname.replace('/api/gemini', '');
    
    const targetUrl = new URL(`https://generativelanguage.googleapis.com${path}`);
    // Add all original search params (like ?key= if the SDK sends a placeholder)
    url.searchParams.forEach((val, key) => targetUrl.searchParams.set(key, val));
    
    // Override with the real server-side key
    targetUrl.searchParams.set('key', apiKey);

    // Forward the exact request
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: {
        'Content-Type': req.headers.get('Content-Type') || 'application/json',
      },
      // Only attach body for non-GET/HEAD requests
      body: (req.method !== 'GET' && req.method !== 'HEAD') ? await req.text() : undefined
    });

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error: any) {
    console.error("[gemini-proxy] Exception:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
