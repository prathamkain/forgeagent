import { NextResponse } from "next/server";
import { getMarketPriceEstimate } from "@/lib/channel3";

function enhancePromptAnatomy(prompt: string): string {
  let enhanced = prompt.trim();
  const lower = enhanced.toLowerCase();

  // Explicitly check for animals or quadrupeds
  const animalKeywords = [
    "dog", "puppy", "hound", "cat", "kitten", "feline", "horse", "stallion",
    "wolf", "wolves", "lion", "tiger", "bear", "fox", "deer", "cheetah",
    "leopard", "rabbit", "bunny", "animal", "creature", "beast"
  ];
  const hasAnimal = animalKeywords.some((word) => lower.includes(word));

  if (hasAnimal && !lower.includes("four legs") && !lower.includes("anatomically correct")) {
    enhanced += ", anatomically correct, exactly four legs, natural posture, realistic body proportions";
  }

  // Visual-quality enhancement tags if not already present
  if (!lower.includes("8k") && !lower.includes("photorealistic")) {
    enhanced += ", photorealistic, anatomically explicit details, 8k photograph, cinematic lighting, masterwork composition, high-fidelity";
  }

  return enhanced;
}

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
        lower.includes("dog") ||
        lower.includes("cat") ||
        lower.length > 20;

      if (isDesignRequest) {
        const rawPrompt =
          typeof message === "string" && message.trim().length > 0
            ? message.trim()
            : "cyberpunk digital concept art";
        const promptString = enhancePromptAnatomy(
          `Masterpiece digital art of ${rawPrompt}`
        );
        const imagePrompt = promptString;
        const previewImageUrl = `/api/image-proxy?prompt=${encodeURIComponent(imagePrompt)}`;

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
  "imagePrompt": "A highly descriptive, photorealistic, anatomically explicit visual prompt based on user request"
}

Critical Instructions for imagePrompt:
- Generate highly descriptive, photorealistic, anatomically explicit details.
- For animal descriptions (e.g., dog, cat, horse, wolf): you MUST explicitly specify "anatomically correct, exactly four legs, natural posture, realistic body proportions" (e.g. for "dog", expand to "a happy, realistic golden retriever with exactly four legs, running naturally, in a cinematic sunlit wildflower field, 8k photograph, high-fidelity, anatomically correct").
- Always include visual-quality enhancement tags: "photorealistic, 8k photograph, cinematic lighting, high-fidelity, detailed composition, masterwork".
- Strictly prevent anatomical distortions: never depict extra limbs, mutated anatomy, or unnatural bodies.

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
    const rawPrompt =
      (typeof parsed.imagePrompt === "string" && parsed.imagePrompt.trim().length > 0)
        ? parsed.imagePrompt.trim()
        : (typeof message === "string" && message.trim().length > 0)
        ? `Masterpiece digital art of ${message.trim()}`
        : "Masterpiece digital art, futuristic cyberpunk cinematic concept";

    const promptString = enhancePromptAnatomy(rawPrompt);
    const imagePrompt = isPreview ? promptString : undefined;
    const previewImageUrl = isPreview
      ? `/api/image-proxy?prompt=${encodeURIComponent(promptString)}`
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
