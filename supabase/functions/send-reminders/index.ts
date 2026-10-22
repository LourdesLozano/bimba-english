import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
const cronSecret = Deno.env.get("REMINDER_CRON_SECRET");

if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
  throw new Error("Faltan secrets de Supabase o claves VAPID.");
}

webpush.setVapidDetails("mailto:bimba-english@example.invalid", vapidPublicKey, vapidPrivateKey);
const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async request => {
  if (request.headers.get("x-reminder-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data, error } = await supabase.from("push_subscriptions").select("id, subscription");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0;
  const expired: number[] = [];
  for (const row of data || []) {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify({
        title: "Bimba English",
        body: "Tu práctica de inglés te está esperando. Unos minutos cuentan.",
        url: "./",
        tag: "bimba-daily-reminder"
      }));
      sent += 1;
    } catch (notificationError) {
      const statusCode = (notificationError as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) expired.push(row.id);
    }
  }

  if (expired.length) await supabase.from("push_subscriptions").delete().in("id", expired);
  return Response.json({ sent, removed: expired.length });
});
