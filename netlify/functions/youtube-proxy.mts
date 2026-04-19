import type { Context, Config } from "@netlify/functions";

/**
 * ─────────────────────────────────────────────────────────────────
 *  Netlify Serverless Function — YouTube API Proxy
 * ─────────────────────────────────────────────────────────────────
 *
 *  Keeps the YouTube Data API key server-side so it is never
 *  exposed in the client-side JavaScript bundle.
 *
 *  The client sends:
 *    POST /api/youtube  { endpoint: "search" | "videos", params: {...} }
 *
 *  This function appends the secret API key and forwards the
 *  request to Google, returning the JSON response.
 * ─────────────────────────────────────────────────────────────────
 */

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

export default async (req: Request, _context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // @ts-ignore
  const apiKey = (
    process.env.YOUTUBE_API_KEY || 
    process.env.VITE_YOUTUBE_API_KEY || 
    ""
  ).trim();
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: { message: "YouTube API key is not configured on the server." } }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  try {
    const body = await req.json();
    const { endpoint, params } = body as {
      endpoint: "search" | "videos";
      params: Record<string, string>;
    };

    if (!endpoint || !params) {
      return new Response(
        JSON.stringify({ error: { message: "Missing 'endpoint' or 'params' in request body." } }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Whitelist allowed endpoints
    if (!["search", "videos"].includes(endpoint)) {
      return new Response(
        JSON.stringify({ error: { message: `Invalid endpoint: "${endpoint}"` } }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Build the Google API URL — inject the secret key server-side
    const searchParams = new URLSearchParams({ ...params, key: apiKey });
    const googleUrl = `${YOUTUBE_API_URL}/${endpoint}?${searchParams}`;

    const googleRes = await fetch(googleUrl);
    const data = await googleRes.json();

    if (!googleRes.ok) {
      return new Response(JSON.stringify(data), {
        status: googleRes.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err: any) {
    console.error("[youtube-proxy] Error:", err);
    return new Response(
      JSON.stringify({ error: { message: err?.message || "Internal server error" } }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
};

export const config: Config = {
  path: "/api/youtube",
};
