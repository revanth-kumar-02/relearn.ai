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

  const useCase = req.headers.get("x-gemini-use-case") || "default";

  // Select the appropriate key based on use case
  let apiKey = "";
  if (useCase === "plan") {
    apiKey = (process.env.GEMINI_PLAN_API_KEY || process.env.VITE_GEMINI_PLAN_API_KEY || "").trim();
  } else if (useCase === "chat") {
    apiKey = (process.env.GEMINI_CHAT_API_KEY || process.env.VITE_GEMINI_CHAT_API_KEY || "").trim();
  } else if (useCase === "image") {
    apiKey = (process.env.GEMINI_IMAGE_API_KEY || process.env.VITE_GEMINI_IMAGE_API_KEY || "").trim();
  } else if (useCase === "learning") {
    apiKey = (process.env.GEMINI_LEARNING_API_KEY || process.env.VITE_GEMINI_LEARNING_API_KEY || "").trim();
  }

  // Fallback to primary keys if use-case specific key is missing or not applicable
  if (!apiKey) {
    apiKey = (
      process.env.GEMINI_API_KEY || 
      process.env.VITE_GEMINI_API_KEY || 
      ""
    ).trim();
  }

  // Basic validation to avoid sending placeholders to Google
  const isPlaceholder = apiKey === "PROXY_KEY_MANAGED_BY_SERVER" || apiKey === "your_api_key_here";

  if (!apiKey || isPlaceholder) {
    console.error(`[gemini-proxy] Deployment Error: API key is missing or is a placeholder for useCase: ${useCase}.`);
    return new Response(JSON.stringify({
      error: "API Key Configuration Error. Please set GEMINI_API_KEY in Netlify settings.",
      debug: isPlaceholder ? "Key is a placeholder" : "Key is empty",
      useCase
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(req.url);
    // Remove /api/gemini prefix and ensure the path starts with a single slash
    let cleanPath = url.pathname.replace(/^\/api\/gemini/, '');
    if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;

    // Construct the destination URL
    const googleEndpoint = new URL(`https://generativelanguage.googleapis.com${cleanPath}`);
    googleEndpoint.searchParams.set('key', apiKey);

    // Read the body once
    const requestBody = (req.method !== 'GET' && req.method !== 'HEAD') ? await req.text() : undefined;

    console.log(`[gemini-proxy] Forwarding ${req.method} to Google: ${cleanPath} (Key starting with: ${apiKey.substring(0, 4)}...)`);

    // Forward the request to Google
    const response = await fetch(googleEndpoint.toString(), {
      method: req.method,
      headers: {
        'Content-Type': req.headers.get('Content-Type') || 'application/json',
        // Also send key in header for extra redundancy
        'x-goog-api-key': apiKey,
      },
      body: requestBody
    });

    const responseText = await response.text();

    // If Google returned an error, log a bit of it
    if (!response.ok) {
      console.error(`[gemini-proxy] Google Error (${response.status}):`, responseText.substring(0, 200));
    }

    return new Response(responseText, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-goog-api-key",
        "X-Proxy-Debug-Key-Prefix": apiKey.substring(0, 6),
      },
    });

  } catch (error: any) {
    console.error("[gemini-proxy] Fatal error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
