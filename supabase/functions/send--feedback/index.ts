import { Resend } from "npm:resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const feedbackTo = Deno.env.get("FEEDBACK_TO_EMAIL");

    if (!resendKey || !feedbackTo) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY or FEEDBACK_TO_EMAIL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const payload = await req.json();
    const resend = new Resend(resendKey);
    const siteLabel = payload.siteLabel || "Spot the Phish";
    const score = payload.score ?? "n/a";
    const answers = Array.isArray(payload.answers) ? payload.answers.join(", ") : "n/a";
    const message = payload.message || "";

    const { error } = await resend.emails.send({
      from: "Spot the Phish <onboarding@resend.dev>",
      to: [feedbackTo],
      subject: `${siteLabel} feedback submission`,
      text: `New feedback submission

Score: ${score}
Answers: ${answers}
Session: ${payload.sessionId || "n/a"}
Submitted: ${new Date().toISOString()}

Feedback:
${message}`
    });

    if (error) {
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
