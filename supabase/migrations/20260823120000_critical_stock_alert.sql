-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Critical stock alert (email via Edge Function)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Adds an opt-in preference and a trigger that notifies an Edge Function the
-- moment a product's stock crosses from 'ok' into 'critico'/'esgotado'.
-- The full forecast (days until stockout, velocity) is computed inside the
-- Edge Function using supabase/functions/_shared/restockForecast.js — this
-- trigger only decides WHETHER to fire, using a cheap SQL-only urgency check.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. user_preferences.critical_alert_enabled (opt-in, defaults to off)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE user_preferences
  ADD COLUMN critical_alert_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN user_preferences.critical_alert_enabled IS
  'When true, the user receives an email when a product transitions into critico/esgotado stock.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. pg_net (needed to call the Edge Function from inside the trigger)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. stock_urgency_bucket(): SQL mirror of isLowStock()/computeStockStatus()
--    from src/lib/stock.js, kept intentionally minimal (no velocity/forecast
--    here — just enough to know if a stock LEVEL alone is critical).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.stock_urgency_bucket(
  p_current_stock integer,
  p_min_stock integer,
  p_low_stock_threshold integer
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_threshold integer;
BEGIN
  IF p_current_stock <= 0 THEN
    RETURN 'esgotado';
  END IF;

  -- Same precedence as resolveLowStockThreshold() in stock.js: the
  -- product's own min_stock wins over the user's global threshold, which
  -- in turn wins over the system default (5).
  v_threshold := COALESCE(p_min_stock, p_low_stock_threshold, 5);

  -- Strict less-than, matching isLowStock() in src/lib/stock.js exactly.
  IF p_current_stock < v_threshold THEN
    RETURN 'critico';
  END IF;

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION public.stock_urgency_bucket IS
  'SQL-only urgency check (esgotado/critico/ok) used solely to decide whether the critical-stock trigger should fire. The full forecast lives in the Edge Function.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Trigger function: fires the Edge Function only on the ok -> critical
--    transition, so repeated sales while already critical don't spam email.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_critical_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_global_threshold integer;
  v_old_urgency text;
  v_new_urgency text;
  v_function_url text;
  v_service_role_key text;
BEGIN
  -- Skip updates that don't touch current_stock (name/price/category edits, etc).
  IF NEW.current_stock IS NOT DISTINCT FROM OLD.current_stock THEN
    RETURN NEW;
  END IF;

  SELECT low_stock_threshold INTO v_global_threshold
  FROM public.user_preferences
  WHERE user_id = NEW.user_id;

  v_old_urgency := public.stock_urgency_bucket(OLD.current_stock, OLD.min_stock, v_global_threshold);
  v_new_urgency := public.stock_urgency_bucket(NEW.current_stock, NEW.min_stock, v_global_threshold);

  -- Only the ok -> (critico|esgotado) transition fires the alert. A sale
  -- that keeps the product in the same bucket (e.g. critico -> critico,
  -- or critico -> esgotado) does NOT re-fire, to avoid an email per sale.
  IF v_old_urgency = 'ok' AND v_new_urgency IN ('critico', 'esgotado') THEN
    SELECT decrypted_secret INTO v_function_url
    FROM vault.decrypted_secrets
    WHERE name = 'critical_alert_function_url';

    SELECT decrypted_secret INTO v_service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key';

    -- Missing Vault config must never block the stock update itself (a sale
    -- or a manual edit) — log and move on instead of raising an exception.
    IF v_function_url IS NULL OR v_service_role_key IS NULL THEN
      RAISE WARNING 'notify_critical_stock: missing Vault secret(s) (critical_alert_function_url / service_role_key) — skipping alert for product %', NEW.id;
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := jsonb_build_object('product_id', NEW.id, 'user_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_critical_stock IS
  'AFTER UPDATE ON products: calls the send-critical-alert Edge Function via pg_net on the ok -> critico/esgotado transition only.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Trigger
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trigger_notify_critical_stock ON public.products;

CREATE TRIGGER trigger_notify_critical_stock
AFTER UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.notify_critical_stock();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. REQUIRED one-time setup (run manually in the SQL Editor, NOT part of
--    this migration — these are credentials and must not be versioned):
--
--    The trigger reads its config from vault.decrypted_secrets, by name:
--      - 'critical_alert_function_url' -> the FULL URL of the send-critical-alert
--        function (e.g. 'https://<project-ref>.supabase.co/functions/v1/send-critical-alert')
--      - 'service_role_key'            -> the project's service role key
--
--    Create them with:
--      SELECT vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-critical-alert', 'critical_alert_function_url');
--      SELECT vault.create_secret('<service-role-key>', 'service_role_key');
--
--    If either secret is missing, notify_critical_stock() logs a WARNING
--    and returns without calling the Edge Function — it never blocks the
--    underlying stock update (sale or manual edit).
-- ─────────────────────────────────────────────────────────────────────────────
