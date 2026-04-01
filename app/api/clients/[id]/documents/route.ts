import { NextRequest, NextResponse } from 'next/server';
import { getClientById, updateClient } from '@/lib/clients';
import { uploadDocument } from '@/lib/document-upload';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const client = await getClientById(id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const doc = await uploadDocument(id, file);

    const documents = [...(client.documents ?? []), doc];
    await updateClient(id, { documents });

    return NextResponse.json({ document: doc });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
