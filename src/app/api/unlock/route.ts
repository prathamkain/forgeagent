import { NextRequest, NextResponse } from "next/server";
import { ASPECTS, AspectKey, sanitizePrompt } from "../../../lib/forgeImage";
import { assetFingerprint, signUnlockToken, isDemoAllowed } from "../../../lib/unlockToken";
import { verifyPayPalOrderCompleted } from "../../../lib/verifyPayPalOrder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const raw: unknown = await req.json().catch(() => null);
  const b = (raw ?? {}) as { orderId?: unknown; prompt?: unknown; seed?: unknown; aspect?: unknown };

  const orderId = typeof b.orderId === "string" ? b.orderId.trim() : "";
  const prompt = sanitizePrompt(typeof b.prompt === "string" ? b.prompt : "");
  const seed = Number(b.seed);
  const aspect = b.aspect as AspectKey;

  if (!orderId || orderId.length > 100) return NextResponse.json({ error: "Missing order id" }, { status: 400 });
  if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  if (!Number.isInteger(seed) || seed < 0 || seed > 2_147_483_647)
    return NextResponse.json({ error: "Invalid seed" }, { status: 400 });
  if (!(aspect in ASPECTS)) return NextResponse.json({ error: "Invalid aspect" }, { status: 400 });

  const fingerprint = assetFingerprint(prompt, seed, aspect);

  try {
    if (orderId.startsWith("DEMO-")) {
      if (!isDemoAllowed()) return NextResponse.json({ error: "Demo unlock is disabled" }, { status: 403 });
      return NextResponse.json({ token: signUnlockToken({ orderId, fingerprint, demo: true }) });
    }

    const paid = await verifyPayPalOrderCompleted(orderId);
    if (!paid) return NextResponse.json({ error: "Payment not completed" }, { status: 402 });

    return NextResponse.json({ token: signUnlockToken({ orderId, fingerprint, demo: false }) });
  } catch (err) {
    console.error("[unlock] failed:", err);
    return NextResponse.json({ error: "Unlock failed, please retry" }, { status: 500 });
  }
}
