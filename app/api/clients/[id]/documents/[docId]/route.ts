import { NextRequest, NextResponse } from 'next/server';
import { getClientById, updateClient } from '@/lib/clients';
import { deleteDocument, getDocumentSignedUrl } from '@/lib/document-upload';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;

    const client = await getClientById(id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const doc = client.documents.find(d => d.id === docId);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const signedUrl = await getDocumentSignedUrl(doc.storagePath);
    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get document URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;

    const client = await getClientById(id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const doc = client.documents.find(d => d.id === docId);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await deleteDocument(doc.storagePath);

    const documents = client.documents.filter(d => d.id !== docId);
    await updateClient(id, { documents });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
