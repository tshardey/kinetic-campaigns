/**
 * @vitest-environment jsdom
 *
 * Ensures bundled Omija data keeps Storage/public URL shape from `campaignOmijaAssetUrl`.
 */
import { describe, it, expect } from "vitest";
import { omijaCampaign } from "./omija";
import { campaignOmijaAssetUrl } from "@/lib/campaign-asset-url";

/** Collect string values for object keys ending in `_url` (covers `image_url`, `map_background_url`, etc.). */
function collectUrlFields(value: unknown, acc: string[] = []): string[] {
  if (value === null || value === undefined) return acc;
  if (Array.isArray(value)) {
    for (const item of value) collectUrlFields(item, acc);
    return acc;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k.endsWith("_url") && typeof v === "string") acc.push(v);
      else collectUrlFields(v, acc);
    }
  }
  return acc;
}

describe("omija campaign image URLs", () => {
  it("exposes at least one URL field", () => {
    const urls = collectUrlFields(omijaCampaign);
    expect(urls.length).toBeGreaterThan(10);
  });

  it("every *_url is non-empty and contains the Omija storage key path segment", () => {
    const urls = collectUrlFields(omijaCampaign);
    for (const url of urls) {
      expect(url.length).toBeGreaterThan(0);
      expect(url).toContain("campaign/omija");
      expect(url).not.toContain("..");
    }
  });

  it("matches campaignOmijaAssetUrl for each relative path (env aligned with bundled module)", () => {
    const urls = collectUrlFields(omijaCampaign);
    for (const url of urls) {
      const storageMatch = url.match(
        /\/storage\/v1\/object\/public\/campaign-assets\/campaign\/omija\/(.+)$/
      );
      const publicMatch = url.match(/\/campaign\/omija\/(.+)$/);
      const rel = storageMatch?.[1] ?? publicMatch?.[1];
      expect(rel, `could not parse relative path from ${url}`).toBeTruthy();
      expect(campaignOmijaAssetUrl(rel!)).toBe(url);
    }
  });
});
