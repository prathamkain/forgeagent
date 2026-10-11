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

// Preview (client) and master download (server) BOTH use this, so same
// prompt + seed + aspect => identical composition.
export function buildImageCandidates(
  userPrompt: string,
  seed: number,
  aspect: AspectKey
): ImageCandidate[] {
  const { width, height } = ASPECTS[aspect];
  const fullPrompt = encodeURIComponent(
    `${sanitizePrompt(userPrompt)}, ${QUALITY_BOOSTERS}`
  );
  const params = (extra: Record<string, string> = {}) =>
    new URLSearchParams({
      width: String(width),
      height: String(height),
      seed: String(seed),
      nologo: "true",
      enhance: "false",
      private: "true",
      negative_prompt: NEGATIVE_PROMPT,
      ...extra,
    }).toString();

  return [
    { id: "pollinations-flux", url: `https://image.pollinations.ai/prompt/${fullPrompt}?${params({ model: "flux" })}` },
    { id: "pollinations-gen-flux", url: `https://gen.pollinations.ai/image/${fullPrompt}?${params({ model: "flux" })}` },
    { id: "pollinations-default", url: `https://image.pollinations.ai/prompt/${fullPrompt}?${params()}` },
  ];
}
