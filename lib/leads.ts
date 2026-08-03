import { supabase } from './supabase';
import { UpworkLead, LeadStatus, ProposalComponents } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRow(lead: Partial<UpworkLead> & { jobId: string }) {
  return {
    job_id: lead.jobId,
    title: lead.title,
    description: lead.description,
    budget: lead.budget ?? null,
    budget_type: lead.budgetType ?? null,
    category: lead.category ?? null,
    skills: lead.skills ?? [],
    client_country: lead.clientCountry ?? null,
    client_spend: lead.clientSpend ?? null,
    client_hire_rate: lead.clientHireRate ?? null,
    client_review_score: lead.clientReviewScore ?? null,
    client_first_name: lead.clientFirstName ?? null,
    posted_at: lead.postedAt ?? null,
    job_url: lead.jobUrl ?? null,
    proposal: lead.proposal ?? null,
    screening_questions: lead.screeningQuestions ?? null,
    screening_answers: lead.screeningAnswers ?? null,
    score: lead.score ?? null,
    starred: lead.starred ?? false,
    status: lead.status ?? 'new',
    applied_at: lead.appliedAt ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(row: any): UpworkLead {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    jobId: row.job_id,
    title: row.title,
    description: row.description,
    budget: row.budget,
    budgetType: row.budget_type,
    category: row.category,
    skills: row.skills ?? [],
    clientCountry: row.client_country,
    clientSpend: row.client_spend,
    clientHireRate: row.client_hire_rate,
    clientReviewScore: row.client_review_score,
    clientFirstName: row.client_first_name,
    postedAt: row.posted_at,
    jobUrl: row.job_url,
    proposal: row.proposal,
    screeningQuestions: row.screening_questions ?? null,
    screeningAnswers: row.screening_answers,
    hooks: row.hooks ?? null,
    components: row.components ?? null,
    score: row.score,
    starred: row.starred ?? false,
    status: row.status,
    appliedAt: row.applied_at ?? null,
  };
}

export async function getAllLeads(status?: LeadStatus): Promise<UpworkLead[]> {
  const appliedStatuses: LeadStatus[] = ['applied', 'won', 'lost'];
  const orderColumn = status && appliedStatuses.includes(status) ? 'applied_at' : 'created_at';

  let query = supabase
    .from('upwork_leads')
    .select('*')
    .order(orderColumn, { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

export async function getLeadById(id: string): Promise<UpworkLead | null> {
  const { data, error } = await supabase
    .from('upwork_leads')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return fromRow(data);
}

export async function getLeadByJobId(jobId: string): Promise<UpworkLead | null> {
  const { data, error } = await supabase
    .from('upwork_leads')
    .select('*')
    .eq('job_id', jobId)
    .single();
  if (error) return null;
  return fromRow(data);
}

export async function createLead(
  lead: Omit<UpworkLead, 'id' | 'createdAt' | 'updatedAt'>,
  vollnaPayload?: unknown
): Promise<UpworkLead> {
  const row = {
    ...toRow(lead),
    vollna_payload: vollnaPayload ?? null,
  };

  const { data, error } = await supabase
    .from('upwork_leads')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

export async function upsertLead(
  lead: Omit<UpworkLead, 'id' | 'createdAt' | 'updatedAt'>,
  vollnaPayload?: unknown
): Promise<UpworkLead> {
  // Check if lead already exists - if so, only update job details, NOT user data (proposal, score, status, etc.)
  const existing = await getLeadByJobId(lead.jobId);

  if (existing) {
    // Only update job metadata, preserve user-generated data
    const { data, error } = await supabase
      .from('upwork_leads')
      .update({
        title: lead.title,
        description: lead.description,
        budget: lead.budget,
        budget_type: lead.budgetType,
        category: lead.category,
        skills: lead.skills,
        client_country: lead.clientCountry,
        client_spend: lead.clientSpend,
        client_hire_rate: lead.clientHireRate,
        client_review_score: lead.clientReviewScore,
        client_first_name: lead.clientFirstName,
        posted_at: lead.postedAt,
        job_url: lead.jobUrl,
        vollna_payload: vollnaPayload ?? null,
        updated_at: new Date().toISOString(),
        // DO NOT update: proposal, screening_answers, hooks, score, status
      })
      .eq('job_id', lead.jobId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return fromRow(data);
  }

  // New lead - create with null proposal
  const row = {
    ...toRow(lead),
    vollna_payload: vollnaPayload ?? null,
  };

  const { data, error } = await supabase
    .from('upwork_leads')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

export async function updateLead(id: string, updates: Partial<UpworkLead>): Promise<UpworkLead> {
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.status !== undefined) {
    dbUpdates.status = updates.status;
    if (updates.status === 'applied') {
      dbUpdates.applied_at = new Date().toISOString();
    }
  }
  if (updates.proposal !== undefined) dbUpdates.proposal = updates.proposal;
  if (updates.screeningAnswers !== undefined) dbUpdates.screening_answers = updates.screeningAnswers;
  if (updates.hooks !== undefined) dbUpdates.hooks = updates.hooks;
  if (updates.components !== undefined) dbUpdates.components = updates.components as ProposalComponents;
  if (updates.score !== undefined) dbUpdates.score = updates.score;
  if (updates.starred !== undefined) dbUpdates.starred = updates.starred;

  const { data, error } = await supabase
    .from('upwork_leads')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

export async function getRecentProposals(limit = 4): Promise<string[]> {
  const { data, error } = await supabase
    .from('upwork_leads')
    .select('proposal')
    .not('proposal', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((r: { proposal: string }) => r.proposal).filter(Boolean);
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('upwork_leads').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
