import { NextRequest, NextResponse } from 'next/server';
import { upsertLead } from '@/lib/leads';
import { generateLeadProposal } from '@/lib/ai/lead-proposal-writer';
import { UpworkLead } from '@/types';

interface ClientWorkHistoryItem {
  score?: number;
  comment?: string;
}

interface VollnaWebhookPayload {
  event?: string;
  data?: {
    id: string;
    title: string;
    description: string;
    budget?: {
      amount?: number;
      type?: 'fixed' | 'hourly';
      min?: number;
      max?: number;
    };
    category?: string;
    skills?: string[];
    client?: {
      country?: string;
      totalSpend?: number;
      hireRate?: number;
      reviewScore?: number;
      workHistory?: ClientWorkHistoryItem[];
    };
    clientWorkHistory?: ClientWorkHistoryItem[];
    postedAt?: string;
    url?: string;
    questions?: string[];
  };
  // Alternative flat structure
  id?: string;
  title?: string;
  description?: string;
}

// Extract first name from review comments
// Looks for patterns like "John was great", "Working with Sarah", "Thanks Mike"
function extractFirstNameFromReviews(workHistory?: ClientWorkHistoryItem[]): string | null {
  if (!workHistory || workHistory.length === 0) return null;

  // Common patterns where names appear in reviews
  const namePatterns = [
    /^([A-Z][a-z]{2,12})\s+(?:was|is|has been)/i,  // "John was great"
    /working with\s+([A-Z][a-z]{2,12})/i,           // "Working with Sarah"
    /thanks?\s*,?\s+([A-Z][a-z]{2,12})/i,           // "Thanks Mike" or "Thank you, Mike"
    /([A-Z][a-z]{2,12})\s+(?:is a|was a|is an|was an)\s+(?:great|excellent|amazing|wonderful|fantastic)/i,
    /recommend\s+([A-Z][a-z]{2,12})/i,              // "I recommend John"
    /hired\s+([A-Z][a-z]{2,12})/i,                  // "I hired Sarah"
  ];

  // Common names to validate against (helps filter false positives)
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
    if (!item.comment) continue;

    for (const pattern of namePatterns) {
      const match = item.comment.match(pattern);
      if (match && match[1]) {
        const name = match[1].toLowerCase();
        if (commonNames.has(name)) {
          nameCounts[match[1]] = (nameCounts[match[1]] || 0) + 1;
        }
      }
    }
  }

  // Return the most frequently mentioned name
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

    const payload: VollnaWebhookPayload = await request.json();

    // Handle both nested (data.X) and flat payload structures
    const rawData = payload.data ?? payload;
    if (!rawData.id || !rawData.title || !rawData.description) {
      return NextResponse.json({ error: 'Missing required fields: id, title, description' }, { status: 400 });
    }

    // After validation, we know these fields exist
    const data = rawData as NonNullable<VollnaWebhookPayload['data']>;

    // Transform payload to lead format
    const jobData = transformPayload(data);

    // Generate proposal using Claude
    const { proposal, screeningAnswers, score } = await generateLeadProposal(
      jobData,
      data.questions || []
    );

    // Build lead object
    const lead: Omit<UpworkLead, 'id' | 'createdAt' | 'updatedAt'> = {
      ...jobData,
      proposal,
      screeningAnswers,
      score,
      status: 'new',
    };

    // Upsert to database (updates if job_id exists)
    const savedLead = await upsertLead(lead, payload);

    return NextResponse.json({ success: true, leadId: savedLead.id });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

function transformPayload(data: NonNullable<VollnaWebhookPayload['data']>): Omit<UpworkLead, 'id' | 'createdAt' | 'updatedAt' | 'proposal' | 'screeningAnswers' | 'score' | 'status'> {
  let budget: string | null = null;
  if (data.budget) {
    if (data.budget.amount) {
      budget = `$${data.budget.amount}`;
    } else if (data.budget.min && data.budget.max) {
      budget = `$${data.budget.min} - $${data.budget.max}`;
    } else if (data.budget.min) {
      budget = `$${data.budget.min}+`;
    }
  }

  // Try to extract client first name from work history reviews
  const workHistory = data.clientWorkHistory || data.client?.workHistory;
  const clientFirstName = extractFirstNameFromReviews(workHistory);

  return {
    jobId: data.id,
    title: data.title,
    description: data.description,
    budget,
    budgetType: data.budget?.type || null,
    category: data.category || null,
    skills: data.skills || [],
    clientCountry: data.client?.country || null,
    clientSpend: data.client?.totalSpend ? `$${data.client.totalSpend}` : null,
    clientHireRate: data.client?.hireRate ? `${data.client.hireRate}%` : null,
    clientReviewScore: data.client?.reviewScore?.toString() || null,
    clientFirstName,
    postedAt: data.postedAt || new Date().toISOString(),
    jobUrl: data.url || `https://www.upwork.com/jobs/${data.id}`,
  };
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'Webhook endpoint active',
    usage: 'POST job data to this endpoint',
  });
}
