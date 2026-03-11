import { supabase } from './supabase';
import { Proposal } from '@/types';

function toRow(p: Proposal) {
  return {
    id: p.id,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
    status: p.status,
    notion_page_id: p.notionPageId,
    notion_url: p.notionUrl,
    client_name: p.clientName,
    client_email: p.clientEmail,
    client_contact: p.clientContact,
    pricing: p.pricing,
    project_title: p.projectTitle ?? null,
    extracted_data: p.extractedData,
    sections: p.sections,
    screenshots: p.screenshots ?? [],
    screenshot_captions: p.screenshotCaptions ?? {},
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(row: any): Proposal {
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
    extractedData: row.extracted_data,
    sections: row.sections,
    screenshots: row.screenshots ?? [],
    screenshotCaptions: row.screenshot_captions ?? {},
  };
}

export async function getAllProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

export async function getProposalById(id: string): Promise<Proposal | null> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return fromRow(data);
}

export async function createProposal(proposal: Proposal): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .insert(toRow(proposal))
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

export async function updateProposal(id: string, updates: Partial<Proposal>): Promise<Proposal> {
  const existing = await getProposalById(id);
  if (!existing) throw new Error('Proposal not found');
  const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  const { data, error } = await supabase
    .from('proposals')
    .update(toRow(merged))
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

export async function deleteProposal(id: string): Promise<void> {
  const { error } = await supabase.from('proposals').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
