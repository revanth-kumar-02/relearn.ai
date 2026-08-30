import { Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

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
  "http://localhost:8888"
];

export default async (req: Request, context: Context) => {
  const origin = req.headers.get("origin") || "";
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  const corsHeaders = {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    console.error("[send-push-notification] Config Error:", err.message);
    return new Response(JSON.stringify({ error: "Service configuration error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const publicKey = (process.env.VITE_VAPID_PUBLIC_KEY || "").trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();

  if (!publicKey || !privateKey) {
    return new Response(JSON.stringify({ error: "Server VAPID keys not configured." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  webpush.setVapidDetails(
    "mailto:support@relearn.ai",
    publicKey,
    privateKey
  );

  try {
    const body = await req.json();
    const { title = "Relearn.ai Alert", notificationBody = "This is a test push notification!", icon = "/logo.png", url = "/" } = body;

    // Fetch user's registered subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("user_push_subscriptions")
      .select("*")
      .eq("user_id", user.id);

    if (subError) {
      console.error("[send-push-notification] Subscriptions query error:", subError.message);
      return new Response(JSON.stringify({ error: "Failed to load push subscriptions." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No push subscriptions found for user.", sentCount: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title,
      body: notificationBody,
      icon,
      url,
      timestamp: Date.now()
    });

    let sentCount = 0;
    const staleEndpoints: string[] = [];

    await Promise.all(
      subscriptions.map(async (subRecord: any) => {
        const pushSub = {
          endpoint: subRecord.endpoint,
          keys: {
            p256dh: subRecord.p256dh,
            auth: subRecord.auth
          }
        };

        try {
          await webpush.sendNotification(pushSub, payload);
          sentCount++;
        } catch (err: any) {
          console.error(`[send-push-notification] Error pushing to ${subRecord.endpoint}:`, err.statusCode || err.message);
          // If subscription is 410 (Gone) or 404 (Not Found), mark for deletion
          if (err.statusCode === 410 || err.statusCode === 404) {
            staleEndpoints.push(subRecord.endpoint);
          }
        }
      })
    );

    // Clean up stale subscriptions if any were found
    if (staleEndpoints.length > 0) {
      await supabase
        .from("user_push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);
    }

    return new Response(JSON.stringify({ success: true, sentCount, staleCleaned: staleEndpoints.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[send-push-notification] Server error:", error.message);
    return new Response(JSON.stringify({ error: "Failed to send push notification." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};
