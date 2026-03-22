# kinetic-campaigns

A fitness game where you hex crawl around completing objectives.

## Local development

### Prerequisites

- **Node.js** 18+ (recommend 20 LTS)
- **npm** (or pnpm / yarn)

### Setup

1. **Clone and install dependencies**

   ```bash
   git clone <repo-url>
   cd kinetic-campaigns
   npm install
   ```

2. **Configure environment**

   Copy the example env file and add your Supabase credentials:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:

   - `VITE_SUPABASE_URL` — your Supabase project URL  
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — the **publishable** (anon) API key (safe for the browser)

   Get these from the [Supabase dashboard](https://supabase.com/dashboard): your project → **Settings** → **API** → **Project URL** and **Project API keys** (use the `anon` / publishable key, not the service role key).

   **Campaign images without files in the repo:** set `VITE_CAMPAIGN_ASSETS_USE_PUBLIC=false` in `.env` and use Supabase Storage only. Point `VITE_SUPABASE_URL` at a local stack (`supabase start` → `http://127.0.0.1:54321`) or your hosted project, apply migrations so the `campaign-assets` bucket exists, then upload images (see `.env.example`). Public object URLs do not require the publishable key for loading images, but you still need it for auth/data features.

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   The app will be at **http://localhost:5173** (or the next free port Vite prints).

   **Important:** Vite reads environment variables from a **`.env` file in the repository root** (next to `package.json`), not from `.devcontainer/.env`. If you use Storage-only images, either copy settings into root `.env` or set `VITE_*` in the shell when starting dev, e.g. `VITE_CAMPAIGN_ASSETS_USE_PUBLIC=false npm run dev` (one line). A plain `VITE_…=false` line in the shell without `export` is often **not** visible to `npm run dev`.

### Troubleshooting campaign images

- **Path:** files live under `public/campaign/omija/` (singular **campaign**, not `campaigns`).
- After removing that folder, URLs must point at Supabase Storage: set `VITE_CAMPAIGN_ASSETS_USE_PUBLIC=false` in **root** `.env` (or use the one-liner above), ensure `VITE_SUPABASE_URL` is set, and **upload** the same assets into the `campaign-assets` bucket. If the bucket is empty or paths do not match, images will still fail to load.

### Troubleshooting saves (`characters_campaign_id_fkey`)

If the browser console shows `upsert characters failed` and `characters_campaign_id_fkey`, PostgreSQL has no matching row in `public.campaigns` for the campaign id you are playing (for example `omija` when using bundled Omija content).

**Deploy the latest migrations** to your hosted project (`supabase link` then `supabase db push`). That includes:

- A one-time `INSERT` for `omija` (`20250322140000_seed_omija_campaign_for_fk.sql`), and  
- A function `ensure_omija_campaign_row` (`20250322150000_ensure_omija_campaign_row_rpc.sql`) that the app calls before saving so the row exists even if the earlier migration was skipped.

If you cannot use the CLI, run the SQL from those migration files in the Supabase **SQL Editor** (in order).

### Scripts

| Command        | Description                |
|----------------|----------------------------|
| `npm run dev`  | Start Vite dev server      |
| `npm run build`| Type-check and production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint                 |
