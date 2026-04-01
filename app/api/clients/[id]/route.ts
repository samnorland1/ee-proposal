import { NextRequest, NextResponse } from 'next/server';
import { getClientById, updateClient, deleteClient } from '@/lib/clients';
import { deleteAllClientDocuments } from '@/lib/document-upload';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getClientById(id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json({ client });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch client';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateClient(id, body);
    return NextResponse.json({ client: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update client';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Delete all documents from storage first
    await deleteAllClientDocuments(id);
    // Then delete the client record
    await deleteClient(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete client';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
