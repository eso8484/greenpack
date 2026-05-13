-- ============================================================
-- Migration 004: Contract alignment + courier governance hardening
-- ============================================================

-- ----------------------------
-- Orders payment fields
-- ----------------------------
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_provider TEXT CHECK (payment_provider IN ('paystack', 'flutterwave')),
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS payment_currency TEXT NOT NULL DEFAULT 'NGN',
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_metadata JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS orders_payment_reference_idx ON public.orders(payment_reference);

-- ----------------------------
-- Courier application governance
-- ----------------------------
ALTER TABLE public.couriers
ADD COLUMN IF NOT EXISTS application_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (application_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS review_note TEXT;

CREATE INDEX IF NOT EXISTS couriers_application_status_idx ON public.couriers(application_status);

-- Backfill legacy courier records: existing courier/admin profiles should remain approved.
UPDATE public.couriers c
SET
  application_status = 'approved',
  reviewed_at = COALESCE(c.reviewed_at, NOW()),
  review_note = COALESCE(c.review_note, 'Backfilled as approved from legacy courier role')
WHERE EXISTS (
  SELECT 1
  FROM public.profiles p
  WHERE p.id = c.id
    AND p.role IN ('courier', 'admin')
)
AND c.application_status = 'pending';

-- ----------------------------
-- Policy hardening
-- ----------------------------

-- Orders: keep customer access, add vendor/admin access for related records.
DROP POLICY IF EXISTS "orders_select_vendor" ON public.orders;
CREATE POLICY "orders_select_vendor" ON public.orders FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.shops s ON s.id = oi.shop_id
    WHERE oi.order_id = orders.id
      AND s.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all" ON public.orders FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

-- Order items: prevent arbitrary inserts from unrelated users.
DROP POLICY IF EXISTS "order_items_insert" ON public.order_items;
CREATE POLICY "order_items_insert" ON public.order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_id
      AND o.customer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

-- Couriers: never expose KYC data publicly.
DROP POLICY IF EXISTS "couriers_select_all" ON public.couriers;
CREATE POLICY "couriers_select_self_or_admin" ON public.couriers FOR SELECT
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "couriers_admin_update" ON public.couriers;
CREATE POLICY "couriers_admin_update" ON public.couriers FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

-- Deliveries: approved couriers can view pending pool; only assigned courier/admin can update.
DROP POLICY IF EXISTS "deliveries_select_relevant" ON public.deliveries;
CREATE POLICY "deliveries_select_relevant" ON public.deliveries FOR SELECT
USING (
  courier_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_id
      AND o.customer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.shops s ON s.id = oi.shop_id
    WHERE oi.order_id = deliveries.order_id
      AND s.owner_id = auth.uid()
  )
  OR (
    courier_id IS NULL
    AND status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.couriers c
      WHERE c.id = auth.uid()
        AND c.application_status = 'approved'
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "deliveries_insert_customer" ON public.deliveries;
CREATE POLICY "deliveries_insert_customer" ON public.deliveries FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_id
      AND o.customer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "deliveries_update_courier" ON public.deliveries;
CREATE POLICY "deliveries_update_courier" ON public.deliveries FOR UPDATE
USING (
  courier_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  courier_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);
