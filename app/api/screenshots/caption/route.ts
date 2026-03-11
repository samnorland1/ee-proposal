import { NextRequest, NextResponse } from 'next/server';
import { generateCaption } from '@/lib/screenshots';

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();
    if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 });
    const caption = await generateCaption(path);
    return NextResponse.json({ caption });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Caption generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
