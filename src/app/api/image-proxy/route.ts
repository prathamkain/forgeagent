import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get("prompt") || "cyberpunk digital artwork";
  const targetUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=400&nologo=true`;

  try {
    const res = await fetch(targetUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch from pollinations");
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.warn("Pollinations proxy error, falling back to Unsplash:", error);
    try {
      const fallbackRes = await fetch(
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80"
      );
      const fallbackBuffer = await fallbackRes.arrayBuffer();
      return new NextResponse(fallbackBuffer, {
        headers: { "Content-Type": "image/jpeg" },
      });
    } catch (fallbackError) {
      console.error("Image proxy fallback error:", fallbackError);
      return new NextResponse("Failed to load image", { status: 502 });
    }
  }
}
