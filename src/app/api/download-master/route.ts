import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get('prompt') || '';
    const seed = searchParams.get('seed') || '42';

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt + ', hyper-detailed, sharp focus, 8k resolution, masterpiece, cinematic'
    )}?width=1024&height=1024&seed=${seed}`;

    const response = await fetch(imageUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream image fetch failed: ${response.status}` },
        { status: response.status }
      );
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="forgeagent-master-seed-${seed}.jpg"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Download master error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}