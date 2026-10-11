export type AspectKey = "1:1" | "16:9";

export const ASPECTS: Record<
  AspectKey,
  { width: number; height: number; css: string; label: string }
> = {
  "1:1": { width: 1024, height: 1024, css: "1 / 1", label: "1:1" },
  "16:9": { width: 1280, height: 720, css: "16 / 9", label: "16:9" },
};

export const QUALITY_BOOSTERS =
  "ultra sharp focus, highly detailed, intricate details, crisp clean edges, 8k uhd, professional digital concept art, cinematic lighting, masterpiece";

export const NEGATIVE_PROMPT =
  "blurry, low resolution, low quality, pixelated, jpeg artifacts, out of focus, smeared, watercolor wash, deformed, text, watermark, logo";

export type ImageCandidate = { id: string; url: string };

export function sanitizePrompt(input: string): string {
  return input
    .replace(/[\/\\?#]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 999_999) + 1;
}

export function buildImageCandidates(
  userPrompt: string,
  seed: number,
  aspect: AspectKey
): ImageCandidate[] {
  const qs = new URLSearchParams({
    prompt: sanitizePrompt(userPrompt),
    seed: String(seed),
    aspect,
  });
  return [{ id: "forge-preview", url: `/api/preview?${qs.toString()}` }];
}

