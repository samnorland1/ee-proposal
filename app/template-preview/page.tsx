import { ProposalPreview } from '@/components/proposal-preview';
import { Proposal } from '@/types';

const MOCK_PROPOSAL: Proposal = {
  id: 'template-preview',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'draft',
  notionPageId: '',
  notionUrl: '',
  clientName: 'Bella & Co.',
  clientContact: 'Sarah Mills, Founder',
  clientEmail: 'sarah@bellaandco.com',
  pricing: '$2,800',
  extractedData: {
    client_name: 'Bella & Co.',
    client_contact: 'Sarah Mills',
    client_email: 'sarah@bellaandco.com',
    service_type: 'Email Marketing',
    problems: [],
    goals: [],
    project_scope: [],
    deliverables: [],
    timeline: '',
    timeline_details: { deadline: '', urgency_level: '', constraints: '' },
    budget_signals: { mentioned_budget: '', current_costs: '', roi_expectations: '' },
    decision_makers: [],
    technical_context: { current_tools: [], team_size: '', technical_level: '' },
    tone_indicators: { communication_style: '', relationship: '', urgency: '' },
    additional_notes: '',
  },
  sections: {
    intro:
      "Thanks for jumping on a call and walking me through where things are at with Bella & Co. Based on what you shared, I have a clear picture of what your email marketing needs to do and where the gaps are right now.\n\nThis proposal covers a done-for-you email marketing package — written, designed, and sent. You focus on running your business, I handle everything in the inbox.\n\nI have worked with brands at your stage before and the pattern is consistent: email is the highest-ROI channel you have, and most brands are barely scratching the surface of what it can do.",
    currentIssues:
      "Based on our conversation, here is what is holding your email marketing back right now:\n\n- **No consistent send schedule** — emails go out when someone remembers, which means your list is going cold between campaigns\n- **No welcome sequence** — new subscribers are joining and hearing nothing for days or weeks\n- **Generic copy** — your current emails read like broadcasts, not conversations, and click rates show it\n- **No segmentation** — everyone gets the same email regardless of where they are in the buying journey",
    solution:
      "A fully done-for-you email marketing service. I write, design, and send your emails every week — you approve and that is it.\n\n### Month 1 — Foundation\nAudit your current list and platform setup, build a 5-email welcome sequence, and get your first two campaigns live.\n\n### Ongoing — Weekly Campaigns\nOne campaign per week, written and designed to your brand. Includes subject line testing and performance reporting.\n\n### Quarterly — Strategy Review\nReview what is working, update segmentation, and plan the next quarter of content around your launches and promotions.",
    whatsIncluded:
      "### Emails Written & Designed\n- 4 campaign emails per month (weekly send)\n- 5-email welcome sequence for new subscribers\n- Subject line and preview text for every send\n- All copy written in your brand voice\n\n### Strategy & Setup\n- Full audit of your current email setup\n- List segmentation and tagging\n- Send schedule planned around your product calendar\n\n### Reporting\n- Monthly performance report (open rate, clicks, revenue attributed)\n- Recommendations based on what is working",
    whatThisMeans:
      "Your list will hear from you every week without you writing a single word.\n\nNew subscribers will get a sequence that converts them before your next campaign even lands. Your best customers will get emails that feel personal — because they are segmented and written that way.\n\nMore practically: email will become a predictable revenue channel instead of something you feel guilty about neglecting.",
    results:
      "- Grew a skincare brand's email revenue from 8% to 31% of total monthly revenue in 90 days\n- Built a welcome sequence for a DTC candle brand that now converts at 14% to first purchase\n- Took a fashion brand from 1 email/month to weekly sends — open rates went from 18% to 34%\n\n**\"Sam took over our emails completely and within 6 weeks we could see the difference in revenue. Best decision we made this year.\"**\n— Founder, Lune Skincare\n\n**\"The welcome sequence alone paid for three months of retainer. The copy sounds exactly like us — I genuinely forget Sam wrote it.\"**\n— Owner, Oakfield Candles",
    timeline:
      "### Week 1 — Onboarding & Audit\nPlatform access, brand voice document, list audit, welcome sequence outline approved\n\n### Week 2 — Build\nWelcome sequence written, designed, and loaded. First campaign drafted.\n\n### Week 3 — First Send\nWelcome sequence live. Campaign 1 approved and sent.\n\n### Week 4 onwards — Ongoing rhythm\nWeekly campaigns, monthly report, quarterly strategy review\n\n**Note:** Timeline assumes platform access and brand assets provided in week 1.",
    pricing:
      "- Monthly retainer: $2,800/month\n- Minimum term: 3 months\n- Payment: invoiced monthly, due on the 1st\n- Includes: 4 campaigns/month, welcome sequence (month 1 only), monthly report\n- Not included: email platform subscription (Klaviyo, Mailchimp, etc.)",
    clientRequirements:
      "Payment is due on the 1st of each month. The minimum engagement is 3 months. Either party may cancel after the minimum term with 30 days written notice. All copy and designs produced become the property of the client upon receipt of full payment for that month.",
    validity:
      "- Provide brand assets, product info, and campaign briefs at least 5 business days before the send date\n- Respond to drafts within 48 business hours\n- Designate one point of contact for approvals\n- Provide platform access before week 1",
    nextSteps:
      "Work begins within 5 business days of contract signing and receipt of the first month's payment.",
  },
};

export default function TemplatePreviewPage() {
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-950 text-white px-6 py-3 flex items-center justify-between text-sm">
        <span className="font-medium text-white/70">Template Preview — Sample Data</span>
        <span className="text-white/50 text-xs">This is how your proposals will look</span>
      </div>
      <div className="pt-12">
        <ProposalPreview proposal={MOCK_PROPOSAL} />
      </div>
    </>
  );
}
