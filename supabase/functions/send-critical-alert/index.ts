// ═══════════════════════════════════════════════════════════════════════════
// send-critical-alert
// ═══════════════════════════════════════════════════════════════════════════
// Called by the `notify_critical_stock` DB trigger (see
// supabase/migrations/20260823120000_critical_stock_alert.sql) via pg_net,
// the moment a product's stock crosses from 'ok' into 'critico'/'esgotado'.
// Uses the service role client (never exposed to the browser) so it can read
// auth.users and bypass RLS to fetch the product/preferences/sales for the
// user that triggered the update.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calculateRestockForecast } from "../_shared/restockForecast.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const RESEND_FROM = "Estoklab <onboarding@resend.dev>"; // swap once we have our own domain

const FORECAST_WINDOW_DAYS = 28;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let payload: { product_id?: number; user_id?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { product_id, user_id } = payload;
  if (!product_id || !user_id) {
    return jsonResponse({ error: "product_id and user_id are required" }, 400);
  }

  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

  // 1) Product
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, current_stock, min_stock")
    .eq("id", product_id)
    .single();

  if (productError || !product) {
    console.error("[send-critical-alert] Product not found:", productError?.message);
    return jsonResponse({ error: "Product not found" }, 404);
  }

  // 2) User preferences — bail out early (200, no email) if the user hasn't
  //    opted into critical stock alerts.
  const { data: preferences, error: preferencesError } = await supabase
    .from("user_preferences")
    .select("critical_alert_enabled, low_stock_threshold")
    .eq("user_id", user_id)
    .maybeSingle();

  if (preferencesError) {
    console.error("[send-critical-alert] Error fetching preferences:", preferencesError.message);
    return jsonResponse({ error: "Failed to load user preferences" }, 500);
  }

  if (!preferences?.critical_alert_enabled) {
    console.log(
      `[send-critical-alert] User ${user_id} has not opted into critical alerts — skipping email.`
    );
    return jsonResponse({ skipped: true, reason: "critical_alert_enabled is false" }, 200);
  }

  // 3) User email (auth.users, only reachable via the admin/service-role API)
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
  if (userError || !userData?.user?.email) {
    console.error("[send-critical-alert] Could not resolve user email:", userError?.message);
    return jsonResponse({ error: "Could not resolve user email" }, 500);
  }
  const userEmail = userData.user.email;

  // 4) Last 28 days of sales for this product
  const since = new Date();
  since.setDate(since.getDate() - FORECAST_WINDOW_DAYS);

  const { data: salesRows, error: salesError } = await supabase
    .from("sales")
    .select("qty_sold, sold_at")
    .eq("product_id", product_id)
    .eq("user_id", user_id)
    .gte("sold_at", since.toISOString());

  if (salesError) {
    console.error("[send-critical-alert] Error fetching sales history:", salesError.message);
    return jsonResponse({ error: "Failed to load sales history" }, 500);
  }

  const salesHistory = (salesRows || []).map((row) => ({
    date: row.sold_at,
    quantity: row.qty_sold,
  }));

  const forecast = calculateRestockForecast({
    currentStock: product.current_stock,
    salesHistory,
    minStock: product.min_stock,
  });

  // 5) Send the email via Resend
  const emailBody = buildEmailBody(product.name, product.current_stock, forecast);

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [userEmail],
        subject: `Estoque crítico: ${product.name}`,
        html: emailBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("[send-critical-alert] Resend API error:", resendResponse.status, errorText);
      return jsonResponse({ error: "Failed to send email via Resend" }, 500);
    }

    console.log(`[send-critical-alert] Alert email sent to ${userEmail} for product ${product.id}.`);
    return jsonResponse({ success: true }, 200);
  } catch (err) {
    console.error("[send-critical-alert] Unexpected error calling Resend:", err);
    return jsonResponse({ error: "Unexpected error sending email" }, 500);
  }
});

// deno-lint-ignore no-explicit-any
function buildEmailBody(productName: string, currentStock: number, forecast: any): string {
  const daysUntilStockout = forecast.insufficientData
    ? "dados insuficientes"
    : forecast.daysUntilStockout === Infinity
      ? "indeterminado"
      : `${Math.floor(forecast.daysUntilStockout)} dia(s)`;

  const urgency = forecast.insufficientData ? "crítico" : forecast.urgency;

  return `
    <div style="font-family: sans-serif; font-size: 14px; color: #1e293b;">
      <h2 style="margin-bottom: 4px;">Alerta de estoque crítico</h2>
      <p style="color: #64748b; margin-top: 0;">Estoklab</p>
      <table style="border-collapse: collapse; margin-top: 16px;">
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Produto</td><td><strong>${productName}</strong></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Estoque atual</td><td>${currentStock}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Urgência</td><td>${urgency}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Dias estimados até esgotar</td><td>${daysUntilStockout}</td></tr>
      </table>
      <p style="margin-top: 24px; color: #94a3b8; font-size: 12px;">
        Você recebeu este email porque ativou os alertas de estoque crítico nas configurações do Estoklab.
      </p>
    </div>
  `;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
