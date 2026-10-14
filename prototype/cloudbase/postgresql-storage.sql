-- PG-mode CloudBase storage for tasting-record photos.
-- Safe to run after the storage schema has been initialized by CloudBase.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'tasting-photos',
  'tasting-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS tasting_photos_bucket_read ON storage.buckets;
CREATE POLICY tasting_photos_bucket_read ON storage.buckets
  FOR SELECT TO anon, authenticated
  USING (id = 'tasting-photos');

DROP POLICY IF EXISTS tasting_photos_select_own ON storage.objects;
CREATE POLICY tasting_photos_select_own ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tasting-photos'
    AND (storage.foldername(name))[1] = auth.uid()
  );

DROP POLICY IF EXISTS tasting_photos_insert_own ON storage.objects;
CREATE POLICY tasting_photos_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tasting-photos'
    AND (storage.foldername(name))[1] = auth.uid()
  );

DROP POLICY IF EXISTS tasting_photos_update_own ON storage.objects;
CREATE POLICY tasting_photos_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tasting-photos'
    AND (storage.foldername(name))[1] = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'tasting-photos'
    AND (storage.foldername(name))[1] = auth.uid()
  );

DROP POLICY IF EXISTS tasting_photos_delete_own ON storage.objects;
CREATE POLICY tasting_photos_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'tasting-photos'
    AND (storage.foldername(name))[1] = auth.uid()
  );
