# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server at http://localhost:5173 |
| `npm run build` | `tsc -b && vite build` (type-check + production build) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint over the repo |
| `npm test` | Vitest single run (jsdom for `*.test.tsx`, node otherwise) |
| `npm run test:watch` | Vitest watch mode |
| `npx vitest run path/to/file.test.ts` | Run a single test file |
| `npx vitest run -t "name"` | Run tests matching a name |
| `npm run supabase -- <cmd>` | Local Supabase CLI (e.g. `db push`, `start`) |
| `npm run upload:campaign-assets:local` / `:remote` | Upload `public/campaign/omija/` PNGs into the `campaign-assets` Storage bucket |

The TS path alias `@/*` → `src/*` is configured in both `tsconfig.json` and `vite.config.ts` — always import via `@/...` rather than relative paths across module boundaries.

## Environment configuration

Vite reads env vars from a **`.env` in the repo root** (next to `package.json`). The devcontainer also keeps secrets in `.devcontainer/.env`; `vite.config.ts` switches `envDir` to that folder when it exists. Outside the devcontainer, only the root `.env` is read.

Required for any Supabase-backed feature (auth, persistence, published campaigns, Storage assets):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (the publishable / anon key — never the service role key)

Optional:
- `VITE_CAMPAIGN_ID` — pin a specific published campaign row when more than one exists
- `VITE_CAMPAIGN_ASSETS_USE_PUBLIC=false` — always emit Supabase Storage URLs for campaign images instead of `public/campaign/omija/...`. The devcontainer sets this to `false` by default; GitHub Pages controls it via a repo variable.

`isSupabaseConfigured()` (in `src/lib/supabase-config.ts`) is the single source of truth for "do we have real Supabase env." Many code paths fall back to bundled / local behavior when this returns false — check it before adding new Supabase-only features.

## Deployment

`.github/workflows/deploy.yml` deploys `main` to GitHub Pages. `vite.config.ts` sets `base: "/kinetic-campaigns/"`, so all asset URLs and routes assume that subpath in production. The workflow injects `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (secrets) and `VITE_CAMPAIGN_ASSETS_USE_PUBLIC` (variable) at build time — Vite inlines these, so changing them requires a rebuild.

## Architecture

A React 19 + Vite + TypeScript single-page app. State for an active campaign run lives in React (the `useGameState` hook); persistence is dual-target (Supabase when signed in & configured, otherwise `localStorage`). Tailwind v4 is wired via the `@tailwindcss/vite` plugin (no `tailwind.config` content array needed).

### Boot sequence (`src/App.tsx`)

`App` mounts three guards in order, each returning a loading screen until ready. **Hooks that load user-owned state cannot run until all three pass** — adding a new top-level data hook means slotting it into this gating, not putting it above the guards (Rules of Hooks).

1. `AuthProvider` resolves `useAuth().isSessionReady` (instant when Supabase isn't configured).
2. `useCampaign()` returns `{ isCampaignReady: false }` until the campaign package loads. The `UseCampaignResult` discriminated union is intentional — `AppGameShell` takes the "ready" variant so downstream code doesn't re-check.
3. `useGameState({...})` exposes `persistHydrated`; UI waits before deciding character-creation vs. main shell.

### Campaign data (`src/hooks/useCampaign.ts`, `src/lib/campaign-loader.ts`, `src/data/omija.ts`)

A `CampaignPackage` (see `src/types/campaign.ts`) is `{ realm, encounters, anomalies, rifts }`. Loading order:

1. `loadActiveCampaign()` queries Supabase `campaigns` (filtered by `is_published`, optionally `VITE_CAMPAIGN_ID`) plus joined `loot_items`, `encounters`, `rifts`, `dimensional_anomalies`.
2. Returns `null` when Supabase isn't configured **or** in test mode (`import.meta.env.MODE === 'test'`) — tests should not hit the network.
3. `useCampaign` falls back to the bundled `omijaCampaign` on `null` or error.
4. `mergeOmijaBundledContentIfNeeded` patches in bundled encounters/rifts/anomalies if the loaded realm is Omija but related rows are empty (the seed migration adds only the `campaigns` row for FK purposes).

`useCampaign` then generates a rectangular hex grid (`generateRectGrid`) and runs deterministic `placeRifts` then `placeEncounters` using `PLACEMENT_SEED = 42`. Placement is stable for a given seed + realm, which is what makes saves portable.

### Game state & persistence

`useGameState` (`src/hooks/useGameState.ts`) owns character, resources, progression, inventory, map state, encounter HP, anchor uses, and rift progress. It exposes high-level actions (`movePlayer`, `engageEncounter`, `logWorkout`, `attemptRiftStage`, `useDimensionalAnchor`, `purchaseReward`, `completeLevelUp`, …) that call into pure modules under `src/engine/` (`resources.ts`, `progression.ts`, `inventory.ts`, `rift.ts`, `enemy-scaling.ts`, `hex-math.ts`, `encounter-placement.ts`). Keep game-rule logic in `src/engine/` — those modules are pure and easily unit-tested; the hook is the integration layer.

Persistence path:
- Signed-in + Supabase configured → `persistGameStateToSupabase` writes split rows in `characters` (payload jsonb) and `game_states` (map state + pending level-up). `loadPersistedGameStateFromSupabase` reads them. `ensureCampaignRowForPersist` calls the `ensure_omija_campaign_row` RPC before save to satisfy the `characters_campaign_id_fkey` FK.
- Otherwise → `loadGameStateLocal` / `saveGameStateLocal` use `localStorage` key `kinetic-campaigns-game-state` (with one-time migration from legacy `kinetic-campaigns-character`).
- `resolvePersistedGameStateForSignedInUser` (`src/lib/legacy-local-to-supabase-migration.ts`) lifts an existing local save into Supabase on first sign-in.

`applyDamage` in `useGameState.ts` is the canonical 1-point damage pipeline (Ward → Aether → HP, with `defy-reality` move at 0 HP). Reuse it rather than mutating resources directly when adding damage sources.

### Campaign asset URLs (`src/lib/campaign-asset-url.ts`)

Image URLs (realm hero / map background / loot frame, encounter art, loot art) flow through `resolveCampaignImageUrl` / `normalizeCampaignContentUrl`. Behavior:
- If `VITE_CAMPAIGN_ASSETS_USE_PUBLIC` is not `"false"` AND Supabase isn't configured AND no real `VITE_SUPABASE_URL` is set → resolves under `BASE_URL + /campaign/omija/...` (the bundled `public/campaign/omija/` files).
- Otherwise → rewrites to a Supabase Storage public-object URL on the `campaign-assets` bucket (prefix `campaign/omija/`).
- Already-Storage URLs and unrelated absolute URLs pass through unchanged. Old GitHub-Pages-style paths in saves are normalized.

When you change asset behavior, also update the bucket + migrations (`supabase/migrations/*campaign_assets*`) so they stay aligned.

### Supabase migrations (`supabase/migrations/`)

Four migrations define the schema, RLS, Storage bucket, the Omija seed row, and the `ensure_omija_campaign_row` RPC. Read these together with `src/lib/persist-game-state.ts` and `src/lib/campaign-loader.ts` — schema and client expectations are tightly coupled. If you add columns, update both the row interfaces (`CampaignRow`, `EncounterRow`, etc.) and the `*RowToCampaignPackage` mappers.

## Testing notes

- Vitest config lives in `vite.config.ts` (`test: { globals: true, environment: 'node' }`). Component tests use `*.test.tsx` and rely on jsdom (auto-detected by Vitest from the file extension via `@testing-library/jest-dom`).
- `loadActiveCampaign` short-circuits in `MODE === 'test'`; never mock Supabase at the network layer for unit tests, mock the loader module directly.
- Engine modules (`src/engine/*`) are the right place to add unit tests for new game rules — they have no React or Supabase deps.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
