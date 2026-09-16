import { Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

let supabaseClient: any = null;

function getSupabase() {
  if (supabaseClient) return supabaseClient;
  
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase configuration is missing.");
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseClient;
}

const ALLOWED_ORIGINS = [
  "https://relearn-ai.netlify.app",
  "https://relearn.ai",
  "http://localhost:5173",
  "http://localhost:8888"
];

// Simple in-memory sliding window rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_WINDOW = 30; // 30 pushes per minute
const WINDOW_DURATION_MS = 60 * 1000;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const userRate = rateLimitMap.get(userId);

  if (!userRate || now > userRate.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + WINDOW_DURATION_MS });
    return false;
  }

  if (userRate.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  userRate.count++;
  return false;
}

function sanitizeUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "/";
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\")) {
    return trimmed;
  }
  return "/";
}

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

  // 🛑 Rate Limiting
  if (isRateLimited(user.id)) {
    return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
      status: 429,
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
    const {
      title = "Relearn.ai Alert",
      notificationBody = "You have an update in Relearn.ai",
      icon = "/logo.png",
      badge = "/logo.png",
      url = "/",
      tag = "relearn-alert",
      category = "system",
      recipientId
    } = body;

    // Validate and sanitize content: strip HTML tags and non-printable control characters
    const cleanTitle = String(title)
      .replace(/<[^>]*>?/gm, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
      .slice(0, 100);

    const cleanBody = String(notificationBody)
      .replace(/<[^>]*>?/gm, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
      .slice(0, 300);

    const cleanUrl = sanitizeUrl(url);

    const targetUserId = (recipientId && typeof recipientId === "string") ? recipientId : user.id;

    // 🔐 Push Dispatch Authorization Check
    if (targetUserId !== user.id) {
      // Non-admin users are strictly forbidden from targeting other users directly
      const { data: callerProfile, error: callerError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (callerError || callerProfile?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden: You cannot send push notifications to other users." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If authorized admin notifying another user, check recipient's notification preferences
      const { data: recipientData } = await supabase
        .from("users")
        .select("preferences")
        .eq("id", targetUserId)
        .maybeSingle();

      const notifPrefs = recipientData?.preferences?.notifications;
      if (notifPrefs) {
        if (category === "dailyReminder" && notifPrefs.dailyReminder === false) {
          return new Response(JSON.stringify({ message: "Recipient has disabled daily reminders.", sentCount: 0 }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (category === "progressUpdates" && notifPrefs.progressUpdates === false) {
          return new Response(JSON.stringify({ message: "Recipient has disabled progress updates.", sentCount: 0 }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (category === "streakNotifications" && notifPrefs.streakNotifications === false) {
          return new Response(JSON.stringify({ message: "Recipient has disabled streak notifications.", sentCount: 0 }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (category === "taskOverdueAlerts" && notifPrefs.taskOverdueAlerts === false) {
          return new Response(JSON.stringify({ message: "Recipient has disabled overdue alerts.", sentCount: 0 }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Fetch target user's registered subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("user_push_subscriptions")
      .select("*")
      .eq("user_id", targetUserId);

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
      title: cleanTitle,
      body: cleanBody,
      icon,
      badge,
      url: cleanUrl,
      tag,
      timestamp: Date.now()
    });

    let sentCount = 0;
    const staleEndpoints: string[] = [];

    const sendPromises = subscriptions.map(async (subRecord: any) => {
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
    });

    await Promise.allSettled(sendPromises);

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
