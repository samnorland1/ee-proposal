import { NextRequest, NextResponse } from 'next/server';
import { upsertLead, getLeadByJobId } from '@/lib/leads';
import { UpworkLead } from '@/types';
import { supabase } from '@/lib/supabase';
import { scoreLeadFast } from '@/lib/ai/lead-scorer';

// Vollna's actual webhook payload structure (snake_case)
interface VollnaProject {
  title: string;
  description: string;
  url?: string;
  skills?: string; // comma-separated string
  budget?: string; // "750 USD" or "25 - 60 USD"
  budget_type?: string; // "fixed" or "hourly"
  published?: string; // ISO date
  questions?: string[] | null;
  categories?: string[];
  site?: string;
  client_details?: {
    rank?: string;
    rating?: number;
    country?: { name?: string; iso_code2?: string };
    reviews?: number;
    total_hires?: number;
    total_spent?: number;
    registered_at?: string;
    payment_method_verified?: boolean;
  };
  client_work_history?: Array<{
    feedback?: { score?: number; comment?: string };
    feedback_to_client?: { score?: number; comment?: string };
  }>;
}

// Extract job ID from Upwork URL
function extractJobId(url?: string): string {
  if (!url) return `vollna-${Date.now()}`;

  // Try to extract from URL like https://www.upwork.com/jobs/~01abc123
  const match = url.match(/jobs\/~?([a-zA-Z0-9]+)/);
  if (match) return match[1];

  // Fallback to hash of URL
  return `vollna-${url.split('/').pop() || Date.now()}`;
}

// Extract first name from review comments
function extractFirstNameFromReviews(workHistory?: VollnaProject['client_work_history']): string | null {
  if (!workHistory || workHistory.length === 0) return null;

  const namePatterns = [
    /^([A-Z][a-z]{2,12})\s+(?:was|is|has been)/i,
    /working with\s+([A-Z][a-z]{2,12})/i,
    /thanks?\s*,?\s+([A-Z][a-z]{2,12})/i,
    /([A-Z][a-z]{2,12})\s+(?:is a|was a|is an|was an)\s+(?:great|excellent|amazing|wonderful|fantastic)/i,
    /recommend\s+([A-Z][a-z]{2,12})/i,
    /hired\s+([A-Z][a-z]{2,12})/i,
  ];

  const commonNames = new Set([
    'james', 'john', 'robert', 'michael', 'david', 'william', 'richard', 'joseph', 'thomas', 'charles',
    'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen',
    'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth',
    'nancy', 'betty', 'margaret', 'sandra', 'ashley', 'dorothy', 'kimberly', 'emily', 'donna', 'michelle',
    'alex', 'sam', 'chris', 'pat', 'jordan', 'taylor', 'morgan', 'casey', 'jamie', 'jesse',
    'mike', 'dave', 'dan', 'tom', 'bob', 'joe', 'bill', 'jim', 'steve', 'matt',
    'kate', 'jen', 'liz', 'sue', 'kim', 'amy', 'lisa', 'anna', 'emma', 'olivia',
    'raj', 'priya', 'amit', 'sanjay', 'deepak', 'wei', 'chen', 'ahmed', 'omar', 'ali',
  ]);

  const nameCounts: Record<string, number> = {};

  for (const item of workHistory) {
    const comment = item.feedback_to_client?.comment || item.feedback?.comment;
    if (!comment) continue;

    for (const pattern of namePatterns) {
      const match = comment.match(pattern);
      if (match && match[1]) {
        const name = match[1].toLowerCase();
        if (commonNames.has(name)) {
          nameCounts[match[1]] = (nameCounts[match[1]] || 0) + 1;
        }
      }
    }
  }

  const entries = Object.entries(nameCounts);
  if (entries.length === 0) return null;

  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${webhookSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = await request.json();

    // Log ALL payloads to webhook_logs table for debugging
    try {
      await supabase.from('webhook_logs').insert({
        payload: payload,
        received_at: new Date().toISOString()
      });
    } catch {
      // Table might not exist yet, that's fine
      console.log('Could not log to webhook_logs table');
    }

    // Log payload for debugging
    console.log('Vollna webhook received:', JSON.stringify(payload, null, 2));

    // Handle test/ping requests
    if (payload.event === 'test' || payload.type === 'test' || payload.ping || Object.keys(payload).length === 0) {
      return NextResponse.json({ success: true, message: 'Webhook active' });
    }

    // Vollna sends { total, filter, projects: [...] }
    const projects: VollnaProject[] = payload.projects || [];

    if (projects.length === 0) {
      // Maybe single project format
      const singleProject = payload.project ?? payload.data ?? payload;
      if (singleProject.title && singleProject.description) {
        projects.push(singleProject);
      } else {
        return NextResponse.json({
          success: true,
          message: 'No projects found in payload',
          keys: Object.keys(payload)
        });
      }
    }

    const savedLeadIds: string[] = [];

    for (const project of projects) {
      if (!project.title || !project.description) {
        console.log('Skipping project without title/description');
        continue;
      }

      // Transform payload to lead format
      const jobData = transformPayload(project);

      // Check if lead already exists (skip scoring if it does)
      const existingLead = await getLeadByJobId(jobData.jobId);

      let score: number | null = null;
      if (!existingLead) {
        // Only score new leads (saves API calls on duplicates)
        const result = await scoreLeadFast({
          title: jobData.title,
          description: jobData.description,
          budget: jobData.budget,
          budgetType: jobData.budgetType,
          category: jobData.category,
          skills: jobData.skills,
          clientCountry: jobData.clientCountry,
          clientSpend: jobData.clientSpend,
          clientHireRate: jobData.clientHireRate,
          clientReviewScore: jobData.clientReviewScore,
        });
        score = result.score;
      }

      // Build lead object with score but no proposal
      const lead: Omit<UpworkLead, 'id' | 'createdAt' | 'updatedAt'> = {
        ...jobData,
        proposal: null,
        screeningQuestions: jobData.screeningQuestions,
        screeningAnswers: null,
        hooks: null,
        score,
        status: 'new',
      };

      // Upsert to database (updates if job_id exists, preserves score/proposal/status)
      const savedLead = await upsertLead(lead, project);
      savedLeadIds.push(savedLead.id);
    }

    return NextResponse.json({ success: true, count: savedLeadIds.length, leadIds: savedLeadIds });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function transformPayload(project: VollnaProject): Omit<UpworkLead, 'id' | 'createdAt' | 'updatedAt' | 'proposal' | 'screeningAnswers' | 'hooks' | 'score' | 'status'> {
  // Budget is a string like "750 USD" or "25 - 60 USD"
  const budget = project.budget || null;
  const budgetType: 'fixed' | 'hourly' | null = project.budget_type === 'hourly' ? 'hourly' : project.budget_type === 'fixed' ? 'fixed' : null;

  // Skills is comma-separated string
  const skills = project.skills
    ? project.skills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // Extract client first name from work history reviews (snake_case)
  const clientFirstName = extractFirstNameFromReviews(project.client_work_history);

  // Extract job ID from URL
  const jobId = extractJobId(project.url);

  // Client details use snake_case
  const client = project.client_details;

  // Screening questions from Vollna
  const screeningQuestions = project.questions && project.questions.length > 0
    ? project.questions
    : null;

  return {
    jobId,
    title: project.title,
    description: project.description,
    budget,
    budgetType,
    category: project.categories?.[0] || null,
    skills,
    clientCountry: client?.country?.name || null,
    clientSpend: client?.total_spent ? `$${client.total_spent}` : null,
    clientHireRate: client?.total_hires ? `${client.total_hires} hires` : null,
    clientReviewScore: client?.rating?.toString() || null,
    clientFirstName,
    postedAt: project.published || new Date().toISOString(),
    jobUrl: project.url || '',
    screeningQuestions,
  };
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'Webhook endpoint active',
    usage: 'POST job data to this endpoint',
  });
}
