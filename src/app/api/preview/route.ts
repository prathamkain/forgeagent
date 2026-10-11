import { NextRequest, NextResponse } from "next/server";
import { ASPECTS, AspectKey, sanitizePrompt } from "../../../lib/forgeImage";
import { getRenderedImage, RenderError } from "../../../lib/forgeRender";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// tiny per-IP limiter so strangers cannot burn our image quota
const hits = new Map<string, number[]>();
function allowed(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 12) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}

export async function GET(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (!allowed(ip)) {
    return NextResponse.json({ error: "Too many requests, slow down" }, { status: 429 });
  }

  const sp = req.nextUrl.searchParams;
  const prompt = sanitizePrompt(sp.get("prompt") ?? "");
  const seed = Number(sp.get("seed"));
  const aspect = sp.get("aspect") as AspectKey;

  if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  if (!Number.isInteger(seed) || seed < 0 || seed > 2_147_483_647)
    return NextResponse.json({ error: "Invalid seed" }, { status: 400 });
  if (!(aspect in ASPECTS)) return NextResponse.json({ error: "Invalid aspect" }, { status: 400 });

  try {
    const { buf, type } = await getRenderedImage(prompt, seed, aspect);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(buf.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    const status = err instanceof RenderError ? err.status : 502;
    console.error("[preview] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Render unavailable", upstreamStatus: status }, { status: 502 });
  }
}
