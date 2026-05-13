-- ============================================================
-- Migration 005: Security hardening + demo data seeding
-- ============================================================

-- ============================================================
-- SECURITY HARDENING
-- ============================================================

-- ----------------------------
-- Fix search_path on SECURITY DEFINER functions
-- ----------------------------

-- handle_new_user: Auto-create profile on signup
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path='public';

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- update_shop_rating: Auto-update shop rating when review added/deleted
DROP FUNCTION IF EXISTS public.update_shop_rating() CASCADE;
CREATE OR REPLACE FUNCTION public.update_shop_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.shops
  SET
    rating = (SELECT avg(rating)::numeric(3,2) FROM public.reviews WHERE shop_id = coalesce(new.shop_id, old.shop_id)),
    review_count = (SELECT count(*) FROM public.reviews WHERE shop_id = coalesce(new.shop_id, old.shop_id))
  WHERE id = coalesce(new.shop_id, old.shop_id);
  RETURN coalesce(new, old);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path='public';

-- Recreate trigger
DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE PROCEDURE public.update_shop_rating();

-- cleanup_expired_otps: Auto-cleanup expired OTPs
DROP FUNCTION IF EXISTS public.cleanup_expired_otps() CASCADE;
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM verification_otps WHERE expires_at < NOW() - INTERVAL '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path='public';

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_cleanup_otps ON verification_otps;
CREATE TRIGGER trg_cleanup_otps
  AFTER INSERT ON verification_otps
  FOR EACH ROW EXECUTE PROCEDURE public.cleanup_expired_otps();

-- ----------------------------
-- REVOKE EXECUTE on SECURITY DEFINER functions from anon/authenticated
-- ----------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_shop_rating() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_otps() FROM anon, authenticated;

-- ----------------------------
-- Fix overly-permissive RLS policies
-- ----------------------------

-- notifications_insert: Prevent arbitrary inserts
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

-- ============================================================
-- DEMO DATA SEEDING
-- ============================================================

-- Insert demo shops with products and services
-- Note: owner_id will be set to null initially; these are public listings

-- Demo shop 1: Express Laundry
INSERT INTO public.shops (id, owner_id, name, slug, description, short_description, category_id, category_name, location, contact, hours, is_verified, is_featured, rating, review_count, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  NULL,
  'Express Laundry',
  'express-laundry',
  'Fast and reliable laundry services in Lagos. We specialize in express wash, dry cleaning, and ironing services. Same-day delivery available for orders placed before 10 AM.',
  'Fast laundry & dry cleaning services with same-day delivery',
  'laundry',
  'Laundry Services',
  '{"city": "Lagos", "state": "Lagos", "address": "123 Lekki Road, Lekki Phase 1"}'::jsonb,
  '{"phone": "+2348012345678", "whatsapp": "+2348012345678", "email": "hello@expresslaundry.ng"}'::jsonb,
  '{"monday_to_friday": "7:00 AM - 6:00 PM", "saturday": "8:00 AM - 5:00 PM", "sunday": "Closed"}'::jsonb,
  false,
  true,
  4.50,
  8,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Demo shop 2: Quick Dry Cleaning
INSERT INTO public.shops (id, owner_id, name, slug, description, short_description, category_id, category_name, location, contact, hours, is_verified, is_featured, rating, review_count, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  NULL,
  'Quick Dry Cleaning',
  'quick-dry-cleaning',
  'Professional dry cleaning for suits, dresses, and formal wear. We use eco-friendly cleaning agents and have over 5 years of experience.',
  'Premium dry cleaning for professional attire',
  'laundry',
  'Laundry Services',
  '{"city": "Lagos", "state": "Lagos", "address": "456 VI Street, Victoria Island"}'::jsonb,
  '{"phone": "+2348087654321", "whatsapp": "+2348087654321", "email": "service@quickdry.ng"}'::jsonb,
  '{"monday_to_friday": "8:00 AM - 7:00 PM", "saturday": "9:00 AM - 4:00 PM", "sunday": "By appointment"}'::jsonb,
  false,
  false,
  4.80,
  12,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Demo shop 3: Premium Wash
INSERT INTO public.shops (id, owner_id, name, slug, description, short_description, category_id, category_name, location, contact, hours, is_verified, is_featured, rating, review_count, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  NULL,
  'Premium Wash',
  'premium-wash',
  'Industrial laundry service for hotels, restaurants, and corporate clients. Bulk discounts available. Guaranteed turnaround in 24 hours.',
  'Professional bulk laundry for businesses',
  'laundry',
  'Laundry Services',
  '{"city": "Lagos", "state": "Lagos", "address": "789 Ikoyi Close, Ikoyi"}'::jsonb,
  '{"phone": "+2348098765432", "whatsapp": "+2348098765432", "email": "corporate@premiumwash.ng"}'::jsonb,
  '{"monday_to_friday": "6:00 AM - 8:00 PM", "saturday": "7:00 AM - 2:00 PM", "sunday": "Closed"}'::jsonb,
  false,
  false,
  4.20,
  5,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Add services to Express Laundry
INSERT INTO public.services (id, shop_id, name, description, price, price_type, duration, category_id, is_available, created_at)
SELECT
  gen_random_uuid(),
  s.id,
  'Express Wash & Iron',
  'Quick wash and iron service - ready in 24 hours',
  5000,
  'starting_from',
  '24 hours',
  'laundry',
  true,
  NOW()
FROM public.shops s
WHERE s.slug = 'express-laundry'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.services (id, shop_id, name, description, price, price_type, duration, category_id, is_available, created_at)
SELECT
  gen_random_uuid(),
  s.id,
  'Dry Cleaning',
  'Professional dry cleaning for delicate fabrics',
  8000,
  'starting_from',
  '48 hours',
  'laundry',
  true,
  NOW()
FROM public.shops s
WHERE s.slug = 'express-laundry'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Add services to Quick Dry Cleaning
INSERT INTO public.services (id, shop_id, name, description, price, price_type, duration, category_id, is_available, created_at)
SELECT
  gen_random_uuid(),
  s.id,
  'Suit Dry Cleaning',
  'Premium dry cleaning for business suits',
  12000,
  'fixed',
  '48 hours',
  'laundry',
  true,
  NOW()
FROM public.shops s
WHERE s.slug = 'quick-dry-cleaning'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.services (id, shop_id, name, description, price, price_type, duration, category_id, is_available, created_at)
SELECT
  gen_random_uuid(),
  s.id,
  'Wedding Dress Cleaning',
  'Specialist cleaning for wedding and formal dresses',
  25000,
  'fixed',
  '1 week',
  'laundry',
  true,
  NOW()
FROM public.shops s
WHERE s.slug = 'quick-dry-cleaning'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Add services to Premium Wash
INSERT INTO public.services (id, shop_id, name, description, price, price_type, duration, category_id, is_available, created_at)
SELECT
  gen_random_uuid(),
  s.id,
  'Bulk Wash Service',
  'Industrial washing for large quantities. Discount based on volume.',
  3000,
  'per_hour',
  NULL,
  'laundry',
  true,
  NOW()
FROM public.shops s
WHERE s.slug = 'premium-wash'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.services (id, shop_id, name, description, price, price_type, duration, category_id, is_available, created_at)
SELECT
  gen_random_uuid(),
  s.id,
  'Hotel Linen Service',
  'Specialized service for hotel and restaurant linens',
  2500,
  'per_hour',
  NULL,
  'laundry',
  true,
  NOW()
FROM public.shops s
WHERE s.slug = 'premium-wash'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Add sample products to Express Laundry
INSERT INTO public.products (id, shop_id, name, description, price, original_price, category_id, in_stock, quantity, created_at, updated_at)
SELECT
  gen_random_uuid(),
  s.id,
  'Fabric Softener Pouch',
  'Premium fabric softener for extra soft laundry',
  1500,
  2000,
  'laundry',
  true,
  50,
  NOW(),
  NOW()
FROM public.shops s
WHERE s.slug = 'express-laundry'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.products (id, shop_id, name, description, price, original_price, category_id, in_stock, quantity, created_at, updated_at)
SELECT
  gen_random_uuid(),
  s.id,
  'Stain Removal Kit',
  'Complete stain removal treatment for all fabrics',
  3000,
  4000,
  'laundry',
  true,
  30,
  NOW(),
  NOW()
FROM public.shops s
WHERE s.slug = 'express-laundry'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Add sample products to Quick Dry Cleaning
INSERT INTO public.products (id, shop_id, name, description, price, original_price, category_id, in_stock, quantity, created_at, updated_at)
SELECT
  gen_random_uuid(),
  s.id,
  'Garment Storage Box',
  'Eco-friendly storage box for off-season garments',
  5000,
  7000,
  'laundry',
  true,
  20,
  NOW(),
  NOW()
FROM public.shops s
WHERE s.slug = 'quick-dry-cleaning'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Add sample products to Premium Wash
INSERT INTO public.products (id, shop_id, name, description, price, original_price, category_id, in_stock, quantity, created_at, updated_at)
SELECT
  gen_random_uuid(),
  s.id,
  'Bulk Detergent (5kg)',
  'Professional grade detergent for commercial use',
  8000,
  10000,
  'laundry',
  true,
  15,
  NOW(),
  NOW()
FROM public.shops s
WHERE s.slug = 'premium-wash'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Add sample reviews
INSERT INTO public.reviews (id, shop_id, customer_id, customer_name, customer_avatar, rating, comment, created_at)
SELECT
  gen_random_uuid(),
  s.id,
  NULL,
  'Chioma O.',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=chioma',
  5,
  'Excellent service! My clothes came back spotless and smelling fresh. Highly recommend!',
  NOW() - INTERVAL '5 days'
FROM public.shops s
WHERE s.slug = 'express-laundry'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.reviews (id, shop_id, customer_id, customer_name, customer_avatar, rating, comment, created_at)
SELECT
  gen_random_uuid(),
  s.id,
  NULL,
  'Tunde A.',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=tunde',
  4,
  'Very professional team. Quick turnaround time. Will use again.',
  NOW() - INTERVAL '10 days'
FROM public.shops s
WHERE s.slug = 'express-laundry'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.reviews (id, shop_id, customer_id, customer_name, customer_avatar, rating, comment, created_at)
SELECT
  gen_random_uuid(),
  s.id,
  NULL,
  'Aisha M.',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=aisha',
  5,
  'Best dry cleaning service in VI. My suits look like new!',
  NOW() - INTERVAL '3 days'
FROM public.shops s
WHERE s.slug = 'quick-dry-cleaning'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.reviews (id, shop_id, customer_id, customer_name, customer_avatar, rating, comment, created_at)
SELECT
  gen_random_uuid(),
  s.id,
  NULL,
  'Ibrahim K.',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=ibrahim',
  4,
  'Reliable service for our hotel. Fair pricing and consistent quality.',
  NOW() - INTERVAL '7 days'
FROM public.shops s
WHERE s.slug = 'premium-wash'
LIMIT 1
ON CONFLICT DO NOTHING;
