import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get("prompt") || "cyberpunk concept art";

  // Direct Pollinations URL with prompt encoding
  const safePrompt = encodeURIComponent(prompt.trim());
  const targetUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=800&height=500&model=flux&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

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
