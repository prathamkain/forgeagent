import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get("prompt") || "master artwork";
    const seed = searchParams.get("seed") || "42";
    const aspect = searchParams.get("aspect") || "1:1";

    const width = aspect === "16:9" ? 1280 : 1024;
    const height = aspect === "16:9" ? 720 : 1024;

    // Direct clean image endpoint without paywalled flags
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt
    )}?width=${width}&height=${height}&seed=${seed}`;

    const res = await fetch(imageUrl);
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
    }

    const imageArrayBuffer = await res.arrayBuffer();

    // Browser ko force karega ki image open karne ke bajaye file seedha computer mein save kare
    const headers = new Headers();
    headers.set("Content-Type", "image/jpeg");
    headers.set(
      "Content-Disposition",
      `attachment; filename="forgeagent-master-seed-${seed}.jpg"`
    );
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

    return new NextResponse(imageArrayBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Download route error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}