import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPrompt = searchParams.get("prompt")?.trim();
    const seedParam = searchParams.get("seed");
    const quality = searchParams.get("quality") || "draft";
    const aspect = searchParams.get("aspect") || "1:1";
    const isDownload = searchParams.get("download") === "true";

    if (!rawPrompt) {
      return NextResponse.json(
        { error: "Query parameter 'prompt' is required." },
        { status: 400 }
      );
    }

    // Fixed Seed taaki preview aur master image ka subject aur colors 100% same rahe
    const seed = seedParam && !isNaN(Number(seedParam)) ? Number(seedParam) : 42;

    // Dimensions: Master image ke liye maximum 2048px (Ultra-HD 2K/4K max API output)
    let width = 2048;
    let height = 2048;

    if (aspect === "16:9") {
      // 16:9 Cinema Aspect Ratio
      width = quality === "master" ? 2048 : 768;
      height = quality === "master" ? 1152 : 432;
    } else {
      // 1:1 Square Aspect Ratio
      width = quality === "master" ? 2048 : 512;
      height = quality === "master" ? 2048 : 512;
    }

    // Master Quality ke liye AI Engine mein 8K resolution keywords add karein
    const finalPrompt =
      quality === "master"
        ? `${rawPrompt}, 8k resolution, ultra-hd, masterpiece, highly detailed texture, photorealistic, sharp focus, 4k wallpaper quality`
        : rawPrompt;

    // Flux AI generator URL configuration
    const queryArgs = new URLSearchParams({
      width: width.toString(),
      height: height.toString(),
      seed: seed.toString(),
      model: "flux",
      nologo: "true",
      enhance: quality === "master" ? "true" : "false",
    });

    const targetUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      finalPrompt
    )}?${queryArgs.toString()}`;

    // Upstream image fetch logic
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
          ? `attachment; filename="forgeagent-master-8k-seed-${seed}.jpg"`
          : "inline"
      );
      // Browser cache ko block karein taaki purani low-res image screen par stretch na ho
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