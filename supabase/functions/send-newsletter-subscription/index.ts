// @ts-nocheck

import { serve } from "https://deno.land/std@0.211.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import nodemailer from "npm:nodemailer@6";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const EMAIL_TO = Deno.env.get("EMAIL_TO") ?? "kjyotish124@gmail.com";
const SMTP_USER = Deno.env.get("GMAIL_SMTP_USER");
const SMTP_PASSWORD = Deno.env.get("GMAIL_SMTP_PASSWORD");
const SMTP_HOST = Deno.env.get("GMAIL_SMTP_HOST") ?? "smtp.gmail.com";
const SMTP_PORT = Number(Deno.env.get("GMAIL_SMTP_PORT") ?? "465");

const db = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null;

const smtp = SMTP_USER && SMTP_PASSWORD
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    })
  : null;

function clampText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

serve(async (request) => {
  const origin = request.headers.get("origin") ?? "*";
  const headers = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!db || !smtp || !SMTP_USER) {
    return json({ error: "Email service is not configured" }, 500);
  }

  try {
    const body = await request.json();
    const email = clampText(body.email, 254);

    if (!email) {
      return json({ error: "Email is required" }, 400);
    }

    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      return json({ error: "Enter a valid email address" }, 400);
    }

    const { error: saveError } = await db
      .from("newsletter_subscriptions")
      .insert({ email });

    if (saveError) {
      return json({ error: saveError.message }, 500);
    }

    await smtp.sendMail({
      from: `"Editing Instance Newsletter" <${SMTP_USER}>`,
      to: EMAIL_TO,
      replyTo: email,
      subject: `New newsletter signup: ${email}`,
      text: [
        "A new user subscribed to the Editing Instance newsletter.",
        "",
        `Email: ${email}`,
      ].join("\n"),
      html: `
        <h2>New Editing Instance newsletter signup</h2>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      `,
    });

    return json({ message: "Subscription saved" });
  } catch {
    return json({ error: "Unable to process the newsletter signup right now" }, 500);
  }
});
