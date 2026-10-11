import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Render execution window support

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get("prompt")?.trim();
    const seedParam = searchParams.get("seed");
    const quality = searchParams.get("quality") || "draft";
    const aspect = searchParams.get("aspect") || "1:1";
    const isDownload = searchParams.get("download") === "true";

    if (!prompt) {
      return NextResponse.json(
        { error: "Query parameter 'prompt' is required." },
        { status: 400 }
      );
    }

    // Deterministic seed guarantee
    const seed = seedParam && !isNaN(Number(seedParam)) ? Number(seedParam) : 42;

    // Aspect ratio alignment
    let width = 1024;
    let height = 1024;

    if (aspect === "16:9") {
      width = quality === "master" ? 1280 : 768;
      height = quality === "master" ? 720 : 432;
    } else {
      // 1:1 Square
      width = quality === "master" ? 1024 : 512;
      height = quality === "master" ? 1024 : 512;
    }

    // Flux API query setup
    const queryArgs = new URLSearchParams({
      width: width.toString(),
      height: height.toString(),
      seed: seed.toString(),
      model: "flux",
      nologo: "true",
      enhance: quality === "master" ? "true" : "false",
    });

    const targetUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt
    )}?${queryArgs.toString()}`;

    // Upstream fetch controller with timeout guard
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 24000);

    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          Accept: "image/jpeg,image/png,image/*;q=0.9",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.redirect(targetUrl, 307);
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const imageBuffer = await response.arrayBuffer();

      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set(
        "Content-Disposition",
        isDownload
          ? `attachment; filename="forgeagent-master-seed-${seed}.jpg"`
          : "inline"
      );
      // Aggressive cache-busting headers
      headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
      );
      headers.set("Pragma", "no-cache");
      headers.set("Expires", "0");

      return new NextResponse(imageBuffer, {
        status: 200,
        headers,
      });
    } catch {
      clearTimeout(timeoutId);
      return NextResponse.redirect(targetUrl, 307);
    }
  } catch (error) {
    console.error("[ImageProxy Error]:", error);
    return NextResponse.json(
      { error: "Internal error processing asset pipeline." },
      { status: 500 }
    );
  }
}