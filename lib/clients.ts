import { supabase } from './supabase';
import { Client, Proposal } from '@/types';

function toRow(c: Client) {
  return {
    id: c.id,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    country: c.country,
    business_name: c.businessName,
    first_name: c.firstName,
    last_name: c.lastName,
    email: c.email,
    client_type: c.clientType,
    source: c.source ?? '',
    documents: c.documents ?? [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(row: any): Client {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    country: row.country,
    businessName: row.business_name,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    clientType: row.client_type,
    source: row.source ?? '',
    isCurrent: row.is_current ?? true,
    documents: row.documents ?? [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function proposalFromRow(row: any): Proposal {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    notionPageId: row.notion_page_id,
    notionUrl: row.notion_url,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientContact: row.client_contact,
    pricing: row.pricing,
    projectTitle: row.project_title ?? undefined,
    extraContext: row.extra_context ?? undefined,
    sentAt: row.sent_at ?? undefined,
    extractedData: row.extracted_data,
    sections: row.sections,
    screenshots: row.screenshots ?? [],
    screenshotCaptions: row.screenshot_captions ?? {},
    clientId: row.client_id ?? undefined,
  };
}

export async function getAllClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

export async function getClientById(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return fromRow(data);
}

export async function getClientByEmail(email: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('email', email)
    .single();
  if (error) return null;
  return fromRow(data);
}

export async function createClient(client: Client): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .insert(toRow(client))
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<Client> {
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.country !== undefined) dbUpdates.country = updates.country;
  if (updates.businessName !== undefined) dbUpdates.business_name = updates.businessName;
  if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
  if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.clientType !== undefined) dbUpdates.client_type = updates.clientType;
  if (updates.source !== undefined) dbUpdates.source = updates.source;
  if (updates.documents !== undefined) dbUpdates.documents = updates.documents;

  const { data, error } = await supabase
    .from('clients')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getProposalsByClientId(clientId: string): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(proposalFromRow);
}

export async function getUniqueCountries(): Promise<string[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('country');
  if (error) throw new Error(error.message);
  const unique = [...new Set((data ?? []).map(r => r.country).filter(Boolean))];
  return unique.sort();
}

export async function getUniqueSources(): Promise<string[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('source');
  if (error) throw new Error(error.message);
  const unique = [...new Set((data ?? []).map(r => r.source).filter(Boolean))];
  return unique.sort();
}
