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

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   The app will be at **http://localhost:5173** (or the next free port Vite prints).

### Scripts

| Command        | Description                |
|----------------|----------------------------|
| `npm run dev`  | Start Vite dev server      |
| `npm run build`| Type-check and production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint                 |
