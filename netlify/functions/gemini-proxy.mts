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
  let useCaseKey = "";
  if (useCase === "plan") {
    // User specifically requested to use this key for plan generation
    useCaseKey = "AIzaSyBvOf6I19TpudnnXrRVNEudSE5pQ1lfILU";
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
  let cleanPath = url.pathname.replace(/^\/api\/gemini/, '');
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
            "Content-Type": response.headers.get("Content-Type") || "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, x-goog-api-key",
            "X-Proxy-Debug-Key-Prefix": apiKey.substring(0, 6),
            "X-Proxy-Attempt-Success": "true"
          },
        });
      }

      console.warn(`[gemini-proxy] Key ${apiKey.substring(0, 6)} failed with status ${response.status}. Trying next available key...`);
      lastResponse = new Response(responseText, { 
        status: response.status, 
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/json",
          "Access-Control-Allow-Origin": "*",
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
    headers: { 'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*" }
  });
};
