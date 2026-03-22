-- Public Storage bucket for campaign images (PNG assets served via public object URLs).
-- App resolves: {SUPABASE_URL}/storage/v1/object/public/campaign-assets/campaign/omija/...

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-assets',
  'campaign-assets',
  true,
  52428800,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public bucket: allow read via anon/authenticated Storage API.
CREATE POLICY "Public read campaign-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-assets');
