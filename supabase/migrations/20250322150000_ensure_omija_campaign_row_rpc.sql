-- Lets authenticated clients ensure the bundled Omija campaign row exists (FK for characters/game_states)
-- without manual SQL, if earlier INSERT migrations were not applied.

CREATE OR REPLACE FUNCTION public.ensure_omija_campaign_row()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.ensure_omija_campaign_row() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_omija_campaign_row() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_omija_campaign_row() TO service_role;
