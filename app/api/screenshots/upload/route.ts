import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string | null)?.trim();

    if (!file || !folder) {
      return NextResponse.json({ error: 'file and folder are required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = `${folder}/${file.name}`;

    // Ensure bucket exists (silently ignored if already exists)
    await supabase.storage.createBucket('screenshots', { public: true }).catch(() => {});

    const { error } = await supabase.storage
      .from('screenshots')
      .upload(storagePath, buffer, { contentType: file.type, upsert: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('screenshots').getPublicUrl(storagePath);

    return NextResponse.json({ url: publicUrl, folder });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
