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
  extractedData: ExtractedData;
  sections: ProposalSections;
  screenshots?: string[]; // paths relative to public/, e.g. "screenshots/klaviyo/img.png"
  screenshotCaptions?: Record<string, string>; // path → custom caption override
}
