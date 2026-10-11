import sharp from "sharp";
import {
  ASPECTS,
  AspectKey,
  NEGATIVE_PROMPT,
  QUALITY_BOOSTERS,
  sanitizePrompt,
} from "./forgeImage";

export type Rendered = { buf: Buffer; type: string };

export class RenderError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

const MIN_BYTES = 20_000;
const MIN_LONGEST_SIDE = 768;
const ATTEMPT_TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 2;
const AUTH_STATUSES = new Set([401, 402, 403]);

const MAX_CACHE_ITEMS = 24;
const MAX_CACHE_BYTES = 60 * 1024 * 1024;
const cache = new Map<string, Rendered>();
const inflight = new Map<string, Promise<Rendered>>();
let cacheBytes = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function remember(key: string, value: Rendered) {
  const existing = cache.get(key);
  if (existing) {
    cacheBytes -= existing.buf.byteLength;
    cache.delete(key);
  }
  cache.set(key, value);
  cacheBytes += value.buf.byteLength;
  while (cache.size > MAX_CACHE_ITEMS || cacheBytes > MAX_CACHE_BYTES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cacheBytes -= cache.get(oldestKey)!.buf.byteLength;
    cache.delete(oldestKey);
  }
}

function upstreamUrl(prompt: string, seed: number, aspect: AspectKey): string {
  const { width, height } = ASPECTS[aspect];
  const fullPrompt = encodeURIComponent(`${prompt}, ${QUALITY_BOOSTERS}`);
  const qs = new URLSearchParams({
    model: process.env.POLLINATIONS_MODEL || "flux",
    width: String(width),
    height: String(height),
    seed: String(seed),
    nologo: "true",
    enhance: "false",
    private: "true",
    negative_prompt: NEGATIVE_PROMPT,
  });
  return `https://gen.pollinations.ai/image/${fullPrompt}?${qs.toString()}`;
}

async function fetchOnce(url: string): Promise<Rendered> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      Accept: "image/*",
      "User-Agent": "ForgeAgent/1.0",
    };
    const apiKey = process.env.POLLINATIONS_API_KEY;
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store", headers });
    if (!res.ok) throw new RenderError(`upstream ${res.status}`, res.status);
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) throw new RenderError(`bad content-type ${type}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < MIN_BYTES) throw new RenderError("image too small");

    try {
      const meta = await sharp(buf, { failOn: "none" }).metadata();
      if (meta.width && meta.height && Math.max(meta.width, meta.height) < MIN_LONGEST_SIDE) {
        throw new RenderError("low-resolution image rejected");
      }
    } catch (e) {
      if (e instanceof RenderError) throw e;
    }
    return { buf, type };
  } finally {
    clearTimeout(timer);
  }
}

export async function getRenderedImage(
  rawPrompt: string,
  seed: number,
  aspect: AspectKey
): Promise<Rendered> {
  const prompt = sanitizePrompt(rawPrompt);
  const key = `${aspect}|${seed}|${prompt}`;

  const hit = cache.get(key);
  if (hit) return hit;
  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async () => {
    const url = upstreamUrl(prompt, seed, aspect);
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const rendered = await fetchOnce(url);
        remember(key, rendered);
        return rendered;
      } catch (err) {
        lastErr = err;
        console.error(
          `[forgeRender] attempt ${attempt + 1} failed:`,
          err instanceof Error ? err.message : err
        );
        if (err instanceof RenderError && AUTH_STATUSES.has(err.status)) break;
        if (attempt < MAX_ATTEMPTS - 1) await sleep(3000);
      }
    }
    throw lastErr instanceof RenderError ? lastErr : new RenderError("render failed");
  })();

  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}
