// ==========================================================
// BROWSER AGENT - SUPABASE EDGE FUNCTION / CLOUDFLARE WORKERS
// Endpoint: /verify, /activate, /webhook-mayar, /webhook-midtrans
// ==========================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MAYAR_API_TOKEN = Deno.env.get("MAYAR_API_TOKEN") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/licensing/, "");

  try {
    // -----------------------------------------------------------------
    // 1. VERIFY LICENSE STATUS
    // POST /verify -> { license_key, device_id }
    // -----------------------------------------------------------------
    if (path === "/verify" && req.method === "POST") {
      const { license_key, device_id } = await req.json();

      if (!license_key) {
        return new Response(JSON.stringify({ status: "error", message: "License key is required" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const { data: license, error } = await supabase
        .from("licenses")
        .select("*")
        .eq("license_key", license_key.trim().toUpperCase())
        .single();

      if (error || !license) {
        return new Response(JSON.stringify({ status: "invalid", message: "Lisensi tidak ditemukan" }), {
          status: 404,
          headers: corsHeaders,
        });
      }

      // Check device binding
      const registeredDevices: string[] = license.device_ids || [];
      const maxDevices = license.max_devices || 1;
      let isDeviceAllowed = true;

      if (device_id) {
        if (!registeredDevices.includes(device_id)) {
          if (registeredDevices.length < maxDevices) {
            // Auto register new device slot
            registeredDevices.push(device_id);
            await supabase
              .from("licenses")
              .update({ device_ids: registeredDevices, updated_at: new Date().toISOString() })
              .eq("id", license.id);
          } else {
            isDeviceAllowed = false;
          }
        }
      }

      if (!isDeviceAllowed) {
        return new Response(
          JSON.stringify({
            status: "device_limit_reached",
            message: `Lisensi ini sudah terhubung ke ${maxDevices} perangkat maksimal. Hubungi admin untuk reset perangkat.`,
            max_devices: maxDevices,
          }),
          { status: 403, headers: corsHeaders }
        );
      }

      // Check expiry date
      const now = Date.now();
      const expiresAt = new Date(license.expires_at).getTime();
      const isExpired = expiresAt <= now;
      const daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));

      const computedStatus = isExpired ? "expired" : license.status;

      // Update status if expired in DB
      if (isExpired && license.status === "active") {
        await supabase.from("licenses").update({ status: "expired" }).eq("id", license.id);
      }

      return new Response(
        JSON.stringify({
          status: computedStatus,
          license_key: license.license_key,
          tier: license.tier,
          customer_name: license.customer_name,
          expires_at: license.expires_at,
          days_remaining: daysRemaining,
          device_id: device_id,
          topup_url: `https://tiarproperty.mayar.link/topup?key=${license.license_key}`,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // -----------------------------------------------------------------
    // 2. MAYAR.ID WEBHOOK FOR AUTOMATIC TOP-UP
    // POST /webhook-mayar
    // -----------------------------------------------------------------
    if (path === "/webhook-mayar" && req.method === "POST") {
      const payload = await req.json();
      const event = payload.event; // 'payment.received' / 'invoice.paid'
      const customerData = payload.data || {};
      const metadata = customerData.metadata || {};

      const licenseKey = metadata.license_key || customerData.extra_data?.license_key;
      const orderId = customerData.id || customerData.order_id || `ORD-${Date.now()}`;
      const amount = customerData.amount || 99000;
      const durationDays = metadata.duration_days ? parseInt(metadata.duration_days) : 30;

      if (!licenseKey) {
        return new Response(JSON.stringify({ status: "ignored", reason: "No license_key in metadata" }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      // Execute topup function in Supabase
      const { data: result, error } = await supabase.rpc("process_topup_success", {
        p_order_id: String(orderId),
        p_license_key: String(licenseKey).trim().toUpperCase(),
        p_duration_days: durationDays,
        p_amount: amount,
        p_gateway: "mayar",
        p_method: customerData.payment_method || "qris",
      });

      if (error) {
        return new Response(JSON.stringify({ status: "error", error: error.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ status: "success", result }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ status: "not_found" }), {
      status: 404,
      headers: corsHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ status: "server_error", error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
