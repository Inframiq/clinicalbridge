// Supabase Edge Function (Deno): emails a user whenever a row is inserted into
// public.notifications.
//
// Wiring (Supabase dashboard):
//   1. Deploy:  npx supabase functions deploy send-notification-email --no-verify-jwt
//   2. Secrets: npx supabase secrets set RESEND_API_KEY=... EMAIL_FROM="ClinicalBridge <notifications@your-domain>" \
//                 APP_URL=https://your-domain WEBHOOK_SECRET=<random string>
//   3. Database → Webhooks → Create: table public.notifications, event INSERT,
//      type "Supabase Edge Function" → send-notification-email, and add the
//      HTTP header  x-webhook-secret: <same random string>.
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
// The service role is used only to read the recipient's email address and
// notification preferences.

interface NotificationRecord {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string | null;
  topic: string | null;
}

interface RecipientProfile {
  email: string | null;
  full_name: string | null;
  notification_preferences: Record<string, boolean> | null;
}

const env = (name: string) => Deno.env.get(name) ?? "";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderEmail(n: NotificationRecord, name: string | null, appUrl: string): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:28px">
    <tr><td>
      <p style="margin:0 0 16px">${greeting}</p>
      <h1 style="margin:0 0 12px;font-size:18px">${escapeHtml(n.title)}</h1>
      <p style="margin:0 0 24px;line-height:1.5">${escapeHtml(n.body)}</p>
      ${appUrl ? `<a href="${escapeHtml(appUrl)}/login" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px">Open ClinicalBridge</a>` : ""}
      <p style="margin:28px 0 0;font-size:12px;color:#6b7280">You can choose which emails you get under Settings → Notifications.</p>
    </td></tr>
  </table>
</body></html>`;
}

async function getRecipient(userId: string): Promise<RecipientProfile | null> {
  const url = `${env("SUPABASE_URL")}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=email,full_name,notification_preferences`;
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`profile lookup failed: ${res.status} ${await res.text()}`);
  const rows = (await res.json()) as RecipientProfile[];
  return rows[0] ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = env("WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const record = payload?.record as NotificationRecord | undefined;
  if (payload?.type !== "INSERT" || payload?.table !== "notifications" || !record?.user_id) {
    return new Response(JSON.stringify({ skipped: "not a notification insert" }), { status: 200 });
  }

  try {
    const recipient = await getRecipient(record.user_id);
    const email = recipient?.email ?? "";
    if (!email || email.endsWith("@deleted.invalid")) {
      return Response.json({ skipped: "no deliverable email" });
    }
    if (record.topic && recipient?.notification_preferences?.[record.topic] === false) {
      return Response.json({ skipped: `topic ${record.topic} switched off` });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env("EMAIL_FROM"),
        to: [email],
        subject: record.title,
        html: renderEmail(record, recipient?.full_name ?? null, env("APP_URL")),
        text: `${record.title}\n\n${record.body}\n\n${env("APP_URL")}/login`,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error(`[send-notification-email] Resend ${res.status}: ${detail}`);
      return Response.json({ error: "email provider rejected the message" }, { status: 502 });
    }
    return Response.json({ sent: true });
  } catch (err) {
    console.error(`[send-notification-email] ${err instanceof Error ? err.message : String(err)}`);
    return Response.json({ error: "failed to send" }, { status: 500 });
  }
});
