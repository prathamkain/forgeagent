import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get("prompt") || "cyberpunk concept art";
  const seed = searchParams.get("seed") || "101";
  const quality = searchParams.get("quality") || "draft";

  // Draft = 768x512, Master = 1280x720 with enhance flag
  const width = quality === "master" ? 1280 : 768;
  const height = quality === "master" ? 720 : 512;
  const enhance = quality === "master" ? "&enhance=true" : "";

  const safePrompt = encodeURIComponent(prompt.trim());
  const targetUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=${width}&height=${height}&model=flux&seed=${seed}&nologo=true${enhance}`;

  try {
    const res = await fetch(targetUrl, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const contentType = res.headers.get("content-type") || "image/jpeg";
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          // NEVER cache so unlock always gets the real master
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }
  } catch (err) {
    console.error("Image fetch error:", err);
  }

  return NextResponse.redirect(targetUrl);
}
