-- Create public bucket for shop images, product images, service images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shop-assets',
  'shop-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "shop_assets_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'shop-assets');

-- Authenticated upload to own folder ({userId}/...)
CREATE POLICY "shop_assets_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'shop-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Update own files
CREATE POLICY "shop_assets_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'shop-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Delete own files
CREATE POLICY "shop_assets_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'shop-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
