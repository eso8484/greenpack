-- ============================================================================
-- 012_fix_orders_rls_recursion.sql
-- Fixes "infinite recursion detected in policy for relation orders".
--
-- orders_select_vendor queried order_items, and order_items_select queried
-- orders. Inserting an order with RETURNING evaluates the orders SELECT
-- policies on the new row, which dives into order_items, which dives back
-- into orders — infinite loop. Net effect: every order insert threw and the
-- checkout showed "Failed to create order". No order had ever been created.
--
-- Fix: move the orders→items→shops ownership check into a SECURITY DEFINER
-- function. Running as the function owner bypasses RLS on the tables it
-- reads, so it never re-triggers order_items' policies → the cycle is broken.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auth_user_owns_order(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN shops s ON s.id = oi.shop_id
    WHERE oi.order_id = p_order_id
      AND s.owner_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_owns_order(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.auth_user_owns_order(uuid) TO authenticated, anon, service_role;

-- Vendor SELECT: use the SECURITY DEFINER helper instead of an inline
-- subquery against order_items.
DROP POLICY IF EXISTS orders_select_vendor ON public.orders;
CREATE POLICY orders_select_vendor ON public.orders
  FOR SELECT
  USING (public.auth_user_owns_order(id));

-- Vendor (and customer) UPDATE: same helper.
DROP POLICY IF EXISTS orders_update_vendor ON public.orders;
CREATE POLICY orders_update_vendor ON public.orders
  FOR UPDATE
  USING (auth.uid() = customer_id OR public.auth_user_owns_order(id));
