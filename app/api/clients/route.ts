import { NextRequest, NextResponse } from 'next/server';
import { getAllClients, createClient } from '@/lib/clients';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const clients = await getAllClients();
    return NextResponse.json({ clients });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch clients';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.email || !body.clientType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      country: body.country ?? '',
      businessName: body.businessName ?? '',
      firstName: body.firstName ?? '',
      lastName: body.lastName ?? '',
      email: body.email,
      clientType: body.clientType,
      source: body.source ?? '',
      isCurrent: true,
      documents: [],
    };

    const created = await createClient(client);
    return NextResponse.json({ client: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create client';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
