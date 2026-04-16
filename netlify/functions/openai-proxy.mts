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

  const apiKey = Netlify.env.get("OPENAI_API_KEY") || Netlify.env.get("VITE_OPENAI_API_KEY");
  
  if (!apiKey) {
    console.error("[openai-proxy] OPENAI_API_KEY missing");
    return new Response(JSON.stringify({ error: "Server Configuration Error" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/api/openai', '');
    
    // Default openAI base URL
    const targetUrl = new URL(`https://api.openai.com${path}`);
    
    // Add all original search params
    url.searchParams.forEach((val, key) => targetUrl.searchParams.set(key, val));

    // Forward the exact request
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: {
        'Content-Type': req.headers.get('Content-Type') || 'application/json',
        'Authorization': `Bearer ${apiKey}`, // Inject secure key
      },
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
    console.error("[openai-proxy] Exception:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
