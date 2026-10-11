import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { ASPECTS, AspectKey, sanitizePrompt } from "../../../lib/forgeImage";
import { getRenderedImage } from "../../../lib/forgeRender";
import {
  assetFingerprint,
  verifyUnlockToken,
  isDemoAllowed,
} from "../../../lib/unlockToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TARGETS: Record<AspectKey, { width: number; height: number }> = {
  "1:1": { width: 4096, height: 4096 },
  "16:9": { width: 3840, height: 2160 },
};

async function upscaleTo4K(input: Buffer, aspect: AspectKey): Promise<Buffer> {
  const t = TARGETS[aspect];
  sharp.cache(false);
  sharp.concurrency(1);
  return sharp(input, { limitInputPixels: 50_000_000, failOn: "none" })
    .removeAlpha()
    .resize(t.width, t.height, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 1.1, m1: 0.6, m2: 1.8 })
    .png({ compressionLevel: 6, adaptiveFiltering: false })
    .toBuffer();
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const prompt = sanitizePrompt(sp.get("prompt") ?? "");
  const seed = Number(sp.get("seed"));
  const aspect = sp.get("aspect") as AspectKey;

  if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  if (!Number.isInteger(seed) || seed < 0 || seed > 2_147_483_647)
    return NextResponse.json({ error: "Invalid seed" }, { status: 400 });
  if (!(aspect in ASPECTS))
    return NextResponse.json({ error: "Invalid aspect" }, { status: 400 });

  let check;
  try {
    check = verifyUnlockToken(req.headers.get("x-unlock-token"), assetFingerprint(prompt, seed, aspect));
  } catch (err) {
    console.error("[download-master] token check error:", err);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  if (!check.ok) {
    return NextResponse.json({ error: "Payment required", detail: check.reason }, { status: 402 });
  }
  if (check.demo && !isDemoAllowed()) {
    return NextResponse.json({ error: "Demo unlock is disabled" }, { status: 403 });
  }

  let rendered;
  try {
    rendered = await getRenderedImage(prompt, seed, aspect);
  } catch (err) {
    console.error("[download-master] render failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Master render unavailable, please retry." }, { status: 502 });
  }
  const { buf, type } = rendered;

  try {
    const master = await upscaleTo4K(buf, aspect);
    return new NextResponse(
      new Uint8Array(master.buffer as ArrayBuffer, master.byteOffset, master.byteLength),
      {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Length": String(master.byteLength),
          "Content-Disposition": `attachment; filename="forgeagent-master-4k-${seed}.png"`,
          "Cache-Control": "no-store",
          "X-Master-Resolution": `${TARGETS[aspect].width}x${TARGETS[aspect].height}`,
        },
      }
    );
  } catch (upscaleErr) {
    console.error("[download-master] upscale failed, falling back to original:", upscaleErr);
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(buf.byteLength),
        "Content-Disposition": `attachment; filename="forgeagent-master-${seed}.${ext}"`,
        "Cache-Control": "no-store",
        "X-Master-Resolution": "fallback-original",
      },
    });
  }
}