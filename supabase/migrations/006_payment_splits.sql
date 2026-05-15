-- ============================================================================
-- 006_payment_splits.sql
-- Three-way payment split: Vendor (97%) / Platform (3%) / Courier (delivery fee)
-- Adds lat/lng on shops, bank fields on profiles, fee breakdown on orders,
-- service_type on services, leg tracking on deliveries.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ORDERS: full fee breakdown per transaction
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal              NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vendor_payout         NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS courier_payout        NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS courier_paid_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_distance_km  NUMERIC(8,2);

-- ---------------------------------------------------------------------------
-- SHOPS: geocoded coordinates + Paystack subaccount
-- ---------------------------------------------------------------------------
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS lat                       NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS lng                       NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS paystack_subaccount_code  TEXT,
  ADD COLUMN IF NOT EXISTS settlement_bank_code      TEXT,
  ADD COLUMN IF NOT EXISTS settlement_account_number TEXT,
  ADD COLUMN IF NOT EXISTS settlement_account_name   TEXT;

CREATE INDEX IF NOT EXISTS idx_shops_coords ON public.shops (lat, lng);

-- ---------------------------------------------------------------------------
-- PROFILES: courier bank details + Paystack Transfer Recipient
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bank_name                 TEXT,
  ADD COLUMN IF NOT EXISTS bank_code                 TEXT,
  ADD COLUMN IF NOT EXISTS account_number            TEXT,
  ADD COLUMN IF NOT EXISTS account_name              TEXT,
  ADD COLUMN IF NOT EXISTS paystack_recipient_code   TEXT;

-- ---------------------------------------------------------------------------
-- SERVICES: type of delivery mode (in_home / pickup_return / in_store)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'services'
      AND column_name = 'service_type'
  ) THEN
    ALTER TABLE public.services
      ADD COLUMN service_type TEXT NOT NULL DEFAULT 'in_store'
      CHECK (service_type IN ('in_home', 'pickup_return', 'in_store'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- DELIVERIES: leg tracking for pickup_return (two-leg) services
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'deliveries'
      AND column_name = 'leg'
  ) THEN
    ALTER TABLE public.deliveries
      ADD COLUMN leg TEXT DEFAULT 'single'
      CHECK (leg IN ('single', 'pickup', 'return'));
  END IF;
END $$;

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS paid_to_courier_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Helpful comments for future maintainers
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.orders.subtotal               IS 'Sum of item prices before any fees';
COMMENT ON COLUMN public.orders.delivery_fee           IS 'Total customer-facing delivery fee (round-trip for pickup_return)';
COMMENT ON COLUMN public.orders.platform_fee           IS '3% of subtotal taken by GreenPack';
COMMENT ON COLUMN public.orders.vendor_payout          IS 'subtotal - platform_fee (settled by Paystack split)';
COMMENT ON COLUMN public.orders.courier_payout         IS 'Equal to delivery_fee; transferred after delivery completion';
COMMENT ON COLUMN public.shops.paystack_subaccount_code IS 'Required before customers can checkout this shop';
COMMENT ON COLUMN public.profiles.paystack_recipient_code IS 'Required for couriers to receive payouts';
COMMENT ON COLUMN public.services.service_type         IS 'in_home: vendor travels | pickup_return: courier 2 legs | in_store: walk-in';
COMMENT ON COLUMN public.deliveries.leg                IS 'single: 1-trip product | pickup: leg 1 of pickup_return | return: leg 2 of pickup_return';
