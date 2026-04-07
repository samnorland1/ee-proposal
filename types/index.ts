// Client types
export type ClientType = 'B2B' | 'B2C';

export interface ClientDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  storagePath: string;
  uploadedAt: string;
}

export interface Client {
  id: string;
  createdAt: string;
  updatedAt: string;
  country: string;
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  clientType: ClientType;
  source: string;
  isCurrent: boolean;
  documents: ClientDocument[];
}

export interface NotionTranscript {
  pageId: string;
  clientName: string;
  clientEmail: string;
  clientContact: string;
  transcript: string;
  notionUrl: string;
  createdAt: string;
}

export interface ExtractedData {
  client_name: string;
  client_contact: string;
  client_email: string;
  service_type: string;
  problems: string[];
  goals: string[];
  project_scope: string[];
  deliverables: string[];
  timeline: string;
  timeline_details: {
    deadline: string;
    urgency_level: string;
    constraints: string;
  };
  budget_signals: {
    mentioned_budget: string;
    current_costs: string;
    roi_expectations: string;
  };
  decision_makers: string[];
  technical_context: {
    current_tools: string[];
    team_size: string;
    technical_level: string;
  };
  tone_indicators: {
    communication_style: string;
    relationship: string;
    urgency: string;
  };
  additional_notes: string;
}

export interface ProposalSections {
  intro: string;
  currentIssues: string;
  solution: string;
  whatsIncluded: string;
  whatThisMeans: string;
  results: string;
  timeline: string;
  pricing: string;
  clientRequirements: string;
  validity: string;
  nextSteps: string;
  // Optional image arrays
  consultantImages?: string[];
  officeImages?: string[];
  // Optional custom section headlines (overrides defaults)
  headlines?: Record<string, string>;
  // Sections hidden from the proposal output (key names)
  hiddenSections?: string[];
}

/** Keys of ProposalSections whose value is a plain string (excludes image arrays, headlines map). */
export type StringSectionKey =
  | 'intro'
  | 'currentIssues'
  | 'solution'
  | 'whatsIncluded'
  | 'whatThisMeans'
  | 'results'
  | 'timeline'
  | 'pricing'
  | 'clientRequirements'
  | 'validity'
  | 'nextSteps';

export type ProposalStatus = 'draft' | 'ready' | 'sent' | 'won' | 'lost';

export interface QuantifiedProblem {
  problem: string;
  metric: string; // e.g., "20 hours/week", "$5,000/month"
  source: 'transcript' | 'estimated';
}

export interface QuantifiedSolution {
  solution: string;
  improvement: string; // e.g., "80% reduction", "2x increase"
  projectedValue: string; // e.g., "Save 16 hours/week", "$4,000/month recovered"
}

export interface AIThinking {
  quantifiedProblems: QuantifiedProblem[];
  quantifiedSolutions: QuantifiedSolution[];
  roiSummary: string; // e.g., "Based on 2x email performance, expect 2-4x ROI"
  roiRange: string; // e.g., "2-4x"
}

export interface Proposal {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ProposalStatus;
  notionPageId: string;
  notionUrl: string;
  clientName: string;
  clientEmail: string;
  clientContact: string;
  pricing: string;
  projectTitle?: string;
  extraContext?: string;
  sentAt?: string; // ISO timestamp when status changed to 'sent'
  extractedData: ExtractedData;
  sections: ProposalSections;
  aiThinking?: AIThinking;
  screenshots?: string[]; // paths relative to public/, e.g. "screenshots/klaviyo/img.png"
  screenshotCaptions?: Record<string, string>; // path → custom caption override
  clientId?: string; // Link to CRM client record
}

// Upwork Lead types
export type LeadStatus = 'new' | 'applied' | 'skipped' | 'won' | 'lost';

export interface UpworkLead {
  id: string;
  createdAt: string;
  updatedAt: string;
  jobId: string;
  title: string;
  description: string;
  budget: string | null;
  budgetType: 'fixed' | 'hourly' | null;
  category: string | null;
  skills: string[];
  clientCountry: string | null;
  clientSpend: string | null;
  clientHireRate: string | null;
  clientReviewScore: string | null;
  postedAt: string;
  jobUrl: string;
  proposal: string | null;
  screeningAnswers: Record<string, string> | null;
  score: number | null;
  status: LeadStatus;
}
