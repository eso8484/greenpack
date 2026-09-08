-- ============================================================================
-- 016_flutterwave_payment_provider.sql
-- Migrate active marketplace settlement configuration from Paystack to
-- Flutterwave without deleting historic provider data or payment records.
-- ============================================================================

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS flutterwave_subaccount_id TEXT;

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS flutterwave_payout_reference TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS flutterwave_payout_verified_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS deliveries_flutterwave_payout_reference_key
  ON public.deliveries (flutterwave_payout_reference)
  WHERE flutterwave_payout_reference IS NOT NULL;

COMMENT ON COLUMN public.shops.flutterwave_subaccount_id IS
  'Flutterwave collection subaccount ID required for split checkout payments';
COMMENT ON COLUMN public.deliveries.flutterwave_payout_reference IS
  'Idempotency reference for the Flutterwave courier transfer';
COMMENT ON COLUMN public.profiles.flutterwave_payout_verified_at IS
  'When the courier bank account was last verified with Flutterwave';

-- Extend the existing settlement guard to cover Flutterwave subaccounts. The
-- trusted seller payout route uses the service-role client after authorization.
CREATE OR REPLACE FUNCTION public.guard_shop_settlement_change()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  IF
    NEW.paystack_subaccount_code IS NOT DISTINCT FROM OLD.paystack_subaccount_code
    AND NEW.flutterwave_subaccount_id IS NOT DISTINCT FROM OLD.flutterwave_subaccount_id
    AND NEW.settlement_bank_code IS NOT DISTINCT FROM OLD.settlement_bank_code
    AND NEW.settlement_account_number IS NOT DISTINCT FROM OLD.settlement_account_number
    AND NEW.settlement_account_name IS NOT DISTINCT FROM OLD.settlement_account_name
  THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Settlement fields can only be set via /api/seller/payout'
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP TRIGGER IF EXISTS trg_guard_shop_settlement ON public.shops;
CREATE TRIGGER trg_guard_shop_settlement
  BEFORE UPDATE OF
    paystack_subaccount_code,
    flutterwave_subaccount_id,
    settlement_bank_code,
    settlement_account_number,
    settlement_account_name
  ON public.shops
  FOR EACH ROW EXECUTE PROCEDURE public.guard_shop_settlement_change();
