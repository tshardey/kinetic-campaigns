# Suggestions for Improving Realm Packages

This document captures recommendations for future realm packages (e.g. markdown specs like *Realm Package_ The Verdant Expanse of Omija (1).md*) to make them easier to implement in code and to reduce mismatches between the written design and the game implementation.

---

## 1. Image Naming & Paths

**Issue:** Implementers must guess filenames from encounter/entity names. Mismatches (e.g. `echo-forgotten-shogun` vs `echo-of-forgotten-shogun`) cause missing assets in-game.

**Suggestions:**

- **Canonical filenames:** In the realm doc, list the exact filename for each asset (e.g. `encounters/elite/echo-of-forgotten-shogun.png`), not just the display name.
- **Naming convention:** Define a single convention (e.g. kebab-case, no “the”/“of” dropped) and stick to it for all assets. Document it at the top of the package.
- **Asset checklist:** Include a short checklist or table mapping: Display Name → Folder → Filename, so implementers can verify files without re-reading prose.

---

## 2. Encounters & Loot

**Suggestions:**

- **Stable IDs:** Assign a short, stable `id` for each encounter and loot item (e.g. `echo-forgotten-shogun`, `memory-censer`). Reference these IDs when describing drops so code can map 1:1.
- **Loot fields:** For each loot drop, explicitly list: `id`, `name`, `kind` (consumable vs artifact), and the in-game effect (e.g. “+1 Haste”, “1 free Strike”). This avoids inferring behavior from flavor text.
- **Image path:** For each encounter and loot item, specify the exact image path relative to the realm’s asset root (e.g. `encounters/elite/…`, `loot/…`).

---

## 3. Dimensional Anomalies

**Issue:** The doc used “Required Stat” (Brawn, Flow, Focus) while the game uses activity-based resources (Strength → Strikes, Cardio → Slipstream, Yoga → Wards). That required a design decision and extra mapping.

**Suggestions:**

- **Resource costs:** Specify the cost in game resources (e.g. “2 Aether + 1 Strike”) in addition to or instead of “Required Stat.” If you keep Required Stat, add a note: “Implemented as: Brawn → Strikes, Flow → Slipstream, Focus → Wards (or similar).”
- **Lore text:** Keep the existing lore/victory text; it’s useful for UI and flavor. A single line like “Reward: 30 gold + lore” is enough for implementers.

---

## 4. Narrative Rifts

**Issue:** Rifts were described as stat checks (Brawn, Flow) while the game uses resource costs. Stage difficulty (e.g. 1 vs 2 vs 3 resources) was not specified.

**Suggestions:**

- **Stage costs:** For each rift stage, specify the exact resource cost(s), e.g.:
  - Stage 1: 2 Strikes (Strength).
  - Stage 2: 2 Slipstream (Cardio).
  - Stage 3: 1 Strike + 1 Slipstream + 1 Ward (full commitment).
- **Completion reward:** Explicitly list completion XP and the completion loot item (with id and effect, e.g. “Moon-Cat Coin, artifact, +1 Focus”).
- **Scene images:** List the exact filenames for each stage’s scene art (e.g. `scenes/shattered-guardian.png`) in one place.

---

## 5. Structure & Metadata

**Suggestions:**

- **Realm metadata block:** Start the doc with a short, machine-friendly block (or appendix) that could be parsed or copied into code:
  - Realm id, name, grid size (e.g. cols × rows or radius).
  - Map background and hero image paths.
  - Counts: number of basic/elite/boss encounters, anomalies, rifts.
- **Section headers:** Use consistent headers (e.g. `## Encounters`, `### Basic`, `### Elite`) so scripts or humans can quickly find sections.
- **Optional: YAML/JSON snippet:** A small JSON or YAML snippet per section (encounters, anomalies, rift stages) would allow tooling to validate or pre-fill data and reduce typos.

---

## 6. Map & Placement

**Issue:** The doc didn’t specify how many of each encounter type to place or where (e.g. “1 rift, 3 elites, 1 boss”). Implementers inferred this from the plan and code.

**Suggestions:**

- **Placement guidance:** Add a short “Map placement” or “Distribution” section: e.g. “~15–20 basic, 3 elite, 1 boss, 3 anomalies, 1 narrative rift entrance.” Optionally note where the boss or rift should sit (e.g. “boss at far right, rift mid-right”).
- **Grid:** State the intended grid size (e.g. 14×9 for 16:9) so the map and assets align.

---

## 7. Copy & Consistency

**Suggestions:**

- **Display names:** Use the same spelling and punctuation for names in the doc and in image filenames where possible (e.g. “Echo of the Forgotten Shogun” everywhere).
- **Terminology:** Define terms once (Strike, Slipstream, Ward, Aether, Currency) and reuse them so the doc matches in-game UI and code.

---

## Summary Table (quick reference for implementers)

| Section           | What to specify explicitly                                      |
|-------------------|-----------------------------------------------------------------|
| Encounters        | id, name, type, strikes, gold, xp, loot_drop id, image path     |
| Anomalies         | id, name, cost (Aether + resource), gold, lore, image path       |
| Rift stages       | id, name, resource cost(s) per stage, scene image path           |
| Rift completion   | completion_xp, completion_loot id and effect                    |
| Realm             | grid size, map background path, hero image path, loot frame path |
| Images            | Exact filename for every asset (encounters, loot, scenes)       |

These suggestions are based on implementing the Verdant Expanse of Omija; later realms may need extra fields (e.g. difficulty tiers, prerequisites) as the game grows.
