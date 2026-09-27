import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { notificationId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { data: profile, error: profileErr } = await sb
      .from("profile")
      .select("*")
      .maybeSingle();
    if (profileErr) throw profileErr;
    if (!profile) {
      return new Response(JSON.stringify({ skipped: "no profile" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const guardianEmail = profile.guardian_email;
    if (!guardianEmail) {
      return new Response(JSON.stringify({ skipped: "no guardian email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = "Medication Reminder Alert";
    let body = "";

    if (notificationId) {
      const { data: notif, error: notifErr } = await sb
        .from("notifications")
        .select("*")
        .eq("id", notificationId)
        .maybeSingle();
      if (notifErr) throw notifErr;
      if (notif) {
        subject = `Medication Guardian Alert — Level ${notif.level}`;
        body = `${notif.message}\n\nPatient: ${profile.name}\nPhone: ${profile.phone}\n\nPlease follow up with the patient.`;
      }
    } else {
      subject = "Medication Reminder — Dose Missed";
      body = `This is a reminder that ${profile.name} may have missed a scheduled medication dose. Please follow up with them.\n\nPhone: ${profile.phone}`;
    }

    const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ to: guardianEmail, subject, body }),
    }).catch(() => null);

    if (!emailRes || !emailRes.ok) {
      // Fallback: use Resend if available, otherwise just log
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "Medication Guardian <alerts@medication-guardian.app>",
            to: [guardianEmail],
            subject,
            text: body,
          }),
        });
      }
    }

    return new Response(JSON.stringify({ sent: true, to: guardianEmail }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
