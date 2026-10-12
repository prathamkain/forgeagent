import { NextRequest, NextResponse } from "next/server";
import { ASPECTS, AspectKey, sanitizePrompt } from "../../../lib/forgeImage";
import { assetFingerprint } from "../../../lib/unlockToken";
import { BARGAIN_ENABLED, evaluateOffer } from "../../../lib/bargain";
import { signDealToken } from "../../../lib/dealToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!BARGAIN_ENABLED) {
    return NextResponse.json({ error: "Bargaining is disabled" }, { status: 403 });
  }

  const raw: unknown = await req.json().catch(() => null);
  const b = (raw ?? {}) as {
    prompt?: unknown;
    seed?: unknown;
    aspect?: unknown;
    offer?: unknown;
    round?: unknown;
  };

  const prompt = sanitizePrompt(typeof b.prompt === "string" ? b.prompt : "");
  const seed = Number(b.seed);
  const aspect = b.aspect as AspectKey;
  const offer = typeof b.offer === "number" ? b.offer : parseFloat(String(b.offer ?? "0"));
  const round = typeof b.round === "number" && Number.isInteger(b.round) ? Math.max(1, b.round) : 1;

  if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  if (!Number.isInteger(seed) || seed < 0 || seed > 2_147_483_647) {
    return NextResponse.json({ error: "Invalid seed" }, { status: 400 });
  }
  if (!(aspect in ASPECTS)) return NextResponse.json({ error: "Invalid aspect" }, { status: 400 });
  if (isNaN(offer) || offer <= 0) {
    return NextResponse.json({ error: "Invalid offer amount" }, { status: 400 });
  }

  const fingerprint = assetFingerprint(prompt, seed, aspect);
  const evaluation = evaluateOffer(offer, round);

  if (evaluation.status === "accepted" && typeof evaluation.dealPrice === "number") {
    const dealToken = signDealToken({ fingerprint, price: evaluation.dealPrice });
    return NextResponse.json({
      status: "accepted",
      dealPrice: evaluation.dealPrice,
      dealToken,
      message: evaluation.message,
    });
  }

  return NextResponse.json({
    status: evaluation.status,
    counterPrice: evaluation.counterPrice,
    message: evaluation.message,
  });
}
