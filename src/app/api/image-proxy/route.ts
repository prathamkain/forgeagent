import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get("prompt") || "cyberpunk digital artwork";
  const targetUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=768&model=flux&enhance=true&nologo=true&seed=${Date.now()}`;

  try {
    const res = await fetch(targetUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch from pollinations flux");
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.warn("Pollinations Flux primary error, falling back to Flux fallback URL:", error);
    try {
      const fallbackUrl =
        "https://image.pollinations.ai/prompt/artistic%20nature%20photograph%20digital%20masterpiece?width=1024&height=768&model=flux&nologo=true";
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) throw new Error("Flux fallback failed");
      const fallbackBuffer = await fallbackRes.arrayBuffer();
      const contentType = fallbackRes.headers.get("content-type") || "image/jpeg";
      return new NextResponse(fallbackBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (fallbackError) {
      console.warn("Pollinations fallback failed, using safety Unsplash fallback:", fallbackError);
      try {
        const unsplashRes = await fetch(
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80"
        );
        const unsplashBuffer = await unsplashRes.arrayBuffer();
        return new NextResponse(unsplashBuffer, {
          headers: { "Content-Type": "image/jpeg" },
        });
      } catch (finalError) {
        console.error("Image proxy fatal error:", finalError);
        return new NextResponse("Failed to load image", { status: 502 });
      }
    }
  }
}
