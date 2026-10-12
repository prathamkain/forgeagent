import { NextRequest, NextResponse } from "next/server";
import { ASPECTS, AspectKey, sanitizePrompt } from "../../../lib/forgeImage";
import { assetFingerprint, signUnlockToken, isDemoAllowed } from "../../../lib/unlockToken";
import { verifyPayPalOrder } from "../../../lib/verifyPayPalOrder";
import { BARGAIN_ENABLED, BASE_PRICE } from "../../../lib/bargain";
import { verifyDealToken } from "../../../lib/dealToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const raw: unknown = await req.json().catch(() => null);
  const b = (raw ?? {}) as {
    orderId?: unknown;
    prompt?: unknown;
    seed?: unknown;
    aspect?: unknown;
    dealToken?: unknown;
  };

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

    let requiredAmount = BASE_PRICE;
    if (BARGAIN_ENABLED && typeof b.dealToken === "string" && b.dealToken.trim()) {
      const dealCheck = verifyDealToken(b.dealToken.trim(), fingerprint);
      if (dealCheck.ok) {
        requiredAmount = dealCheck.price;
      }
    }

    const verification = await verifyPayPalOrder(orderId);
    if (
      !verification.completed ||
      typeof verification.paidAmount !== "number" ||
      verification.paidAmount < requiredAmount - 0.01 ||
      (verification.currency && verification.currency !== "USD")
    ) {
      return NextResponse.json({ error: "Payment not completed or amount mismatch" }, { status: 402 });
    }

    return NextResponse.json({ token: signUnlockToken({ orderId, fingerprint, demo: false }) });
  } catch (err) {
    console.error("[unlock] failed:", err);
    return NextResponse.json({ error: "Unlock failed, please retry" }, { status: 500 });
  }
}
