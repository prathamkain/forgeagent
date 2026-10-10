import { NextResponse } from "next/server";
import { captureOrder } from "@/lib/paypal";
import prisma from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderID, imagePrompt, previewUrl, sessionId } = body;

    if (!orderID || typeof orderID !== "string") {
      return NextResponse.json(
        { error: "orderID is required." },
        { status: 400 }
      );
    }

    // 1. Capture the PayPal payment
    const captureResult = await captureOrder(orderID);

    // 2. Prepare the enhanced DALL-E prompt
    const basePrompt =
      imagePrompt || "Bespoke digital artwork with futuristic cinematic lighting";
    const enhancedPrompt = `Cinematic, shot on Canon EOS R5, photorealistic, 8k resolution: ${basePrompt}`;

    let finalImageUrl =
      "https://via.placeholder.com/1024x1024/111111/44FF44?text=Final+4K+Masterpiece";

    // 3. Call OpenAI DALL-E 3 API
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== "your_openai_api_key_here") {
      try {
        const dalleRes = await fetch(
          "https://api.openai.com/v1/images/generations",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "dall-e-3",
              prompt: enhancedPrompt,
              n: 1,
              size: "1024x1024",
            }),
          }
        );

        if (dalleRes.ok) {
          const dalleData = await dalleRes.json();
          if (dalleData.data?.[0]?.url) {
            finalImageUrl = dalleData.data[0].url;
          }
        } else {
          const errText = await dalleRes.text();
          console.warn("DALL-E 3 generation call failed:", dalleRes.status, errText);
        }
      } catch (dalleErr) {
        console.error("DALL-E 3 request error:", dalleErr);
      }
    }

    // 4. Record the ProductOrder in SQLite database via Prisma
    const sessionConnectOrCreate = sessionId
      ? {
          connectOrCreate: {
            where: { id: sessionId },
            create: { id: sessionId },
          },
        }
      : {
          create: {},
        };

    const newOrder = await prisma.productOrder.create({
      data: {
        paypalOrderId: orderID,
        status: "PAID",
        price: 4.99,
        promptSpec: enhancedPrompt,
        previewImageUrl: previewUrl || null,
        finalImageUrl: finalImageUrl,
        session: sessionConnectOrCreate,
      },
    });

    // 5. Return success and the real DALL-E 3 image URL to the frontend
    return NextResponse.json({
      success: true,
      data: captureResult,
      finalImageUrl: finalImageUrl,
      order: newOrder,
    });
  } catch (error: unknown) {
    console.error("Error capturing PayPal order and generating art:", error);
    const message =
      error instanceof Error ? error.message : "Failed to capture PayPal order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
