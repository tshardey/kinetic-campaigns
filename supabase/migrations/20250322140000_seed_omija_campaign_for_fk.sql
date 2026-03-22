-- Ensures `campaigns` has id `omija` so `characters` / `game_states` FK succeeds when the app uses
-- bundled Omija or realm.id `omija` while content rows may exist separately.
-- Image columns use path-only values; the client normalizes them via `normalizeCampaignContentUrl`.

INSERT INTO public.campaigns (
  id,
  name,
  theme_description,
  grid_radius,
  grid_cols,
  grid_rows,
  starting_hex,
  hero_image_url,
  map_background_url,
  loot_frame_url,
  is_published
)
VALUES (
  'omija',
  'The Verdant Expanse of Omija',
  'A whimsical, sun-drenched archipelago where the physical and spiritual worlds hold hands. Memories are tangible, and the locals use alchemy and martial artistry to maintain balance. The foul "Inkrot" anomaly has begun corrupting wildlife and kami—you must cleanse the island of the Abyssal Tide.',
  4,
  14,
  9,
  '{"q": -1, "r": 4}'::jsonb,
  'campaign/omija/background/adventure-hero.png',
  'campaign/omija/background/map-background.png',
  'campaign/omija/loot/loot-frame.png',
  true
)
ON CONFLICT (id) DO NOTHING;
