-- Kinetic Campaigns: campaign content (read-mostly) + user save data (RLS per user).
-- Apply via Supabase CLI (`supabase db push`) or SQL Editor in the dashboard.

-- ---------------------------------------------------------------------------
-- Campaign content
-- ---------------------------------------------------------------------------

CREATE TABLE public.campaigns (
  id text PRIMARY KEY,
  name text NOT NULL,
  theme_description text NOT NULL,
  grid_radius integer NOT NULL,
  grid_cols integer,
  grid_rows integer,
  starting_hex jsonb,
  hero_image_url text NOT NULL,
  map_background_url text NOT NULL,
  loot_frame_url text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaigns_grid_dims_ok CHECK (
    (grid_cols IS NULL AND grid_rows IS NULL)
    OR (grid_cols IS NOT NULL AND grid_rows IS NOT NULL AND grid_cols > 0 AND grid_rows > 0)
  )
);

CREATE TABLE public.loot_items (
  campaign_id text NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  id text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('consumable', 'artifact')),
  description text,
  image_url text,
  PRIMARY KEY (campaign_id, id)
);

CREATE TABLE public.encounters (
  campaign_id text NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  id text NOT NULL,
  type text NOT NULL CHECK (type IN ('basic', 'elite', 'boss')),
  name text NOT NULL,
  strikes integer NOT NULL CHECK (strikes > 0),
  gold integer NOT NULL CHECK (gold >= 0),
  xp integer CHECK (xp IS NULL OR xp >= 0),
  image_url text,
  loot_item_id text,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (campaign_id, id),
  CONSTRAINT encounters_loot_fk FOREIGN KEY (campaign_id, loot_item_id)
    REFERENCES public.loot_items (campaign_id, id) ON DELETE SET NULL
);

CREATE INDEX idx_encounters_campaign_sort ON public.encounters (campaign_id, sort_order);

CREATE TABLE public.rifts (
  campaign_id text NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  id text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  image_url text,
  stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  completion_xp integer CHECK (completion_xp IS NULL OR completion_xp >= 0),
  completion_loot_item_id text,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (campaign_id, id),
  CONSTRAINT rifts_completion_loot_fk FOREIGN KEY (campaign_id, completion_loot_item_id)
    REFERENCES public.loot_items (campaign_id, id) ON DELETE SET NULL
);

CREATE INDEX idx_rifts_campaign_sort ON public.rifts (campaign_id, sort_order);

CREATE TABLE public.dimensional_anomalies (
  campaign_id text NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  id text NOT NULL,
  name text NOT NULL,
  image_url text,
  cost integer NOT NULL CHECK (cost >= 0),
  resource text NOT NULL CHECK (resource IN ('strikes', 'wards', 'slipstream')),
  resource_amount integer NOT NULL CHECK (resource_amount > 0),
  gold integer NOT NULL CHECK (gold >= 0),
  lore_text text,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (campaign_id, id)
);

CREATE INDEX idx_dimensional_anomalies_campaign_sort
  ON public.dimensional_anomalies (campaign_id, sort_order);

-- ---------------------------------------------------------------------------
-- User-owned data (Supabase Auth)
-- ---------------------------------------------------------------------------

CREATE TABLE public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  campaign_id text NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id)
);

CREATE INDEX idx_characters_user ON public.characters (user_id);
CREATE INDEX idx_characters_campaign ON public.characters (campaign_id);

CREATE TABLE public.game_states (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  campaign_id text NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  map_state jsonb NOT NULL,
  pending_level_up boolean NOT NULL DEFAULT false,
  pending_progression_after_level_up jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, campaign_id)
);

CREATE INDEX idx_game_states_user ON public.game_states (user_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER campaigns_set_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER characters_set_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER game_states_set_updated_at
  BEFORE UPDATE ON public.game_states
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dimensional_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_states ENABLE ROW LEVEL SECURITY;

-- Published campaign content: readable by anyone with the anon key (and logged-in users).
CREATE POLICY "Campaigns are publicly readable when published"
  ON public.campaigns FOR SELECT
  USING (is_published = true);

CREATE POLICY "Loot items readable for published campaigns"
  ON public.loot_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = loot_items.campaign_id AND c.is_published = true
    )
  );

CREATE POLICY "Encounters readable for published campaigns"
  ON public.encounters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = encounters.campaign_id AND c.is_published = true
    )
  );

CREATE POLICY "Rifts readable for published campaigns"
  ON public.rifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = rifts.campaign_id AND c.is_published = true
    )
  );

CREATE POLICY "Dimensional anomalies readable for published campaigns"
  ON public.dimensional_anomalies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = dimensional_anomalies.campaign_id AND c.is_published = true
    )
  );

-- No INSERT/UPDATE/DELETE policies for content tables — only the service role bypasses RLS for seeds/admin.

-- Characters: one row per user per campaign; full JSON payload matches app Character type.
CREATE POLICY "Users can select own characters"
  ON public.characters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own characters"
  ON public.characters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own characters"
  ON public.characters FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own characters"
  ON public.characters FOR DELETE
  USING (auth.uid() = user_id);

-- Game state: map progress and level-up flags (character copy lives in characters.payload).
CREATE POLICY "Users can select own game states"
  ON public.game_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game states"
  ON public.game_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game states"
  ON public.game_states FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own game states"
  ON public.game_states FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants (Supabase API: anon + authenticated)
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON TABLE public.campaigns TO anon, authenticated;
GRANT SELECT ON TABLE public.loot_items TO anon, authenticated;
GRANT SELECT ON TABLE public.encounters TO anon, authenticated;
GRANT SELECT ON TABLE public.rifts TO anon, authenticated;
GRANT SELECT ON TABLE public.dimensional_anomalies TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.characters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.game_states TO authenticated;

