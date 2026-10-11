import { NextResponse } from "next/server";
import { getMarketPriceEstimate } from "@/lib/channel3";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "A valid message string is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    // Graceful offline/demo fallback if OPENAI_API_KEY is not configured
    if (!apiKey || apiKey === "your_openai_api_key_here") {
      const lower = message.toLowerCase();
      const isDesignRequest =
        lower.includes("create") ||
        lower.includes("generate") ||
        lower.includes("draw") ||
        lower.includes("art") ||
        lower.includes("render") ||
        lower.includes("cyberpunk") ||
        lower.includes("concept") ||
        lower.includes("design") ||
        lower.includes("samurai") ||
        lower.includes("logo") ||
        lower.includes("illustration") ||
        lower.includes("image") ||
        lower.length > 20;

      if (isDesignRequest) {
        const promptString =
          typeof message === "string" && message.trim().length > 0
            ? `Masterpiece digital art of ${message.trim()}, cinematic lighting, 8k resolution, octane render, detailed composition`
            : "Masterpiece digital art, futuristic cyberpunk cinematic concept, octane render, 8k resolution";
        const imagePrompt = promptString;
        const previewImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptString)}?width=600&height=400&nologo=true&seed=${Date.now()}`;

        // Query Channel3 market price intelligence
        const marketIntelligence = await getMarketPriceEstimate(message);

        return NextResponse.json({
          type: "preview",
          message:
            "Here is your low-res prototype concept. Pay $4.99 to unlock and generate the full 4K lossless master via DALL-E 3.",
          reply:
            "Here is your low-res prototype concept. Pay $4.99 to unlock and generate the full 4K lossless master via DALL-E 3.",
          imagePrompt,
          previewImageUrl,
          previewUrl: previewImageUrl,
          marketIntelligence,
        });
      }

      return NextResponse.json({
        type: "chat",
        message:
          "Welcome to ForgeAgent. Describe any aesthetic, artwork concept, or prompt (e.g. 'Cyberpunk neon samurai in rain') to generate a bespoke prototype with Channel3 price intelligence.",
        reply:
          "Welcome to ForgeAgent. Describe any aesthetic, artwork concept, or prompt (e.g. 'Cyberpunk neon samurai in rain') to generate a bespoke prototype with Channel3 price intelligence.",
      });
    }

    const systemPrompt = `You are ForgeAgent, a high-end AI art director and generative visual designer for a bespoke digital art studio.
You must output ONLY a valid JSON object matching one of the following schemas:

Case 1 - If the user is engaging in normal conversation, greetings, or asking general questions:
{
  "type": "chat",
  "message": "your reply"
}

Case 2 - If the user asks for a design, art, illustration, product visual, concept, or creative generation:
{
  "type": "preview",
  "message": "Here is a low-res prototype concept. Pay $4.99 to generate the final 4K version.",
  "imagePrompt": "A detailed DALL-E/Midjourney prompt based on user request"
}

Strict Rules:
- Return ONLY valid JSON, with NO surrounding markdown or extra text.
- Do not output anything outside the JSON object.`;

    // Construct conversation messages
    const messagesPayload: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    if (Array.isArray(history)) {
      for (const item of history) {
        if (item && item.role && item.content) {
          messagesPayload.push({
            role: item.role === "agent" ? "assistant" : "user",
            content: item.content,
          });
        }
      }
    }

    messagesPayload.push({ role: "user", content: message });

    const openAiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: messagesPayload,
        }),
      }
    );

    if (!openAiResponse.ok) {
      const errText = await openAiResponse.text();
      console.error(`OpenAI error (${openAiResponse.status}):`, errText);
      return NextResponse.json(
        { error: `OpenAI API error (${openAiResponse.status}): ${errText}` },
        { status: openAiResponse.status }
      );
    }

    const openAiData = await openAiResponse.json();
    const content = openAiData.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "Empty response received from OpenAI." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content);

    const isPreview = parsed.type === "preview";
    const promptString =
      (typeof parsed.imagePrompt === "string" && parsed.imagePrompt.trim().length > 0)
        ? parsed.imagePrompt.trim()
        : (typeof message === "string" && message.trim().length > 0)
        ? `Masterpiece digital art of ${message.trim()}, cinematic lighting, 8k resolution, octane render, detailed composition`
        : "Masterpiece digital art, futuristic cyberpunk cinematic concept, octane render, 8k resolution";

    const imagePrompt = isPreview ? promptString : undefined;
    const previewImageUrl = isPreview
      ? `https://image.pollinations.ai/prompt/${encodeURIComponent(promptString)}?width=600&height=400&nologo=true&seed=${Date.now()}`
      : undefined;

    // Fetch Channel3 market price intelligence when a design/preview is requested
    let marketIntelligence = undefined;
    if (isPreview) {
      marketIntelligence = await getMarketPriceEstimate(
        imagePrompt || message
      );
    }

    return NextResponse.json({
      type: parsed.type,
      message: parsed.message,
      reply: parsed.message,
      imagePrompt,
      previewImageUrl,
      previewUrl: previewImageUrl,
      marketIntelligence,
    });
  } catch (error) {
    console.error("Error in /api/chat route:", error);
    return NextResponse.json(
      { error: "Internal server error processing chat message." },
      { status: 500 }
    );
  }
}
