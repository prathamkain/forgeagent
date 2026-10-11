import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get("prompt") || "cyberpunk concept art";
  const seed = searchParams.get("seed") || "42";
  const quality = searchParams.get("quality");
  const isMaster = quality === "master";
  const width = searchParams.get("width") || (isMaster ? "1280" : "640");
  const height = searchParams.get("height") || (isMaster ? "720" : "360");

  // Direct Pollinations URL with prompt encoding
  const safePrompt = encodeURIComponent(prompt.trim());
  const targetUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const contentType = res.headers.get("content-type") || "image/jpeg";
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": "inline",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
  } catch (err) {
    console.error(
      "Image proxy primary fetch failed, redirecting to direct provider:",
      err
    );
  }

  // If server fetch times out, 302 redirect browser directly to pollinations client-side
  return NextResponse.redirect(targetUrl);
}
