import { NextRequest, NextResponse } from "next/server";
import { ASPECTS, AspectKey, sanitizePrompt } from "../../../lib/forgeImage";
import { assetFingerprint } from "../../../lib/unlockToken";
import {
  BARGAIN_ENABLED,
  BASE_PRICE,
  MAX_ROUNDS,
  evaluateOffer,
} from "../../../lib/bargain";
import {
  signDealToken,
  signNegotiationToken,
  verifyNegotiationToken,
} from "../../../lib/dealToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

// Per-IP rate limiter: 20 req/min (same style as /api/preview)
const hits = new Map<string, number[]>();
function allowed(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 20) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}

export async function POST(req: NextRequest) {
  if (!BARGAIN_ENABLED) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (!allowed(ip)) {
    return NextResponse.json({ error: "Too many requests, slow down" }, { status: 429 });
  }

  const raw: unknown = await req.json().catch(() => null);
  const b = (raw ?? {}) as {
    prompt?: unknown;
    seed?: unknown;
    aspect?: unknown;
    offer?: unknown;
    negotiationToken?: unknown;
  };

  const prompt = sanitizePrompt(typeof b.prompt === "string" ? b.prompt : "");
  const seed = Number(b.seed);
  const aspect = b.aspect as AspectKey;
  const offer = typeof b.offer === "number" ? b.offer : parseFloat(String(b.offer ?? "0"));

  if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  if (!Number.isInteger(seed) || seed < 0 || seed > 2_147_483_647) {
    return NextResponse.json({ error: "Invalid seed" }, { status: 400 });
  }
  if (!(aspect in ASPECTS)) return NextResponse.json({ error: "Invalid aspect" }, { status: 400 });
  if (!Number.isFinite(offer) || offer <= 0 || offer > BASE_PRICE) {
    return NextResponse.json({ error: "Offer must be a positive number up to $4.99" }, { status: 400 });
  }

  const fingerprint = assetFingerprint(prompt, seed, aspect);

  // Round comes from verified negotiationToken (none = round 1)
  let round = 1;
  if (typeof b.negotiationToken === "string" && b.negotiationToken.trim()) {
    const verified = verifyNegotiationToken(b.negotiationToken.trim(), fingerprint);
    if (!verified.ok) {
      return NextResponse.json({ error: "Invalid or expired negotiation token" }, { status: 400 });
    }
    round = verified.round;
  }

  const evaluation = evaluateOffer(offer, round);

  if (evaluation.decision === "accept") {
    const agreedPrice = evaluation.price;
    const dealToken = signDealToken({ fingerprint, price: agreedPrice });
    return NextResponse.json({
      decision: "accept",
      message: evaluation.message,
      round,
      roundsLeft: Math.max(0, MAX_ROUNDS - round),
      agreedPrice,
      dealToken,
    });
  }

  // Next round token
  const nextRound = round + 1;
  const nextNegotiationToken = signNegotiationToken({
    fingerprint,
    round: nextRound,
  });

  return NextResponse.json({
    decision: evaluation.decision,
    message: evaluation.message,
    counterPrice: evaluation.price,
    round,
    roundsLeft: Math.max(0, MAX_ROUNDS - round),
    negotiationToken: nextNegotiationToken,
  });
}
