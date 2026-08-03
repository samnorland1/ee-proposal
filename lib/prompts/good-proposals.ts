// Real proposals Sam submitted that worked.
// Add new ones here as Sam pastes them in — used as few-shot examples in the system prompt.
// Format: { context: brief description of job type, proposal: full text }

export const GOOD_PROPOSALS: { context: string; proposal: string }[] = [
  {
    context: 'Klaviyo campaign management for DTC ecom brand (client named Justine)',
    proposal: `Hi Justine, I built and ran 1000s of email/sms campaigns across Klaviyo. One store went from $60k to $150k a month. Another jumped 286% (see attached screenshots for dozens more of examples). Both came down to better campaigns, tighter segments, and testing what works. This was part of a wider strategy covering campaigns, flows and deliverability.

I work with DTC Shopify brands on Klaviyo and have helped dozens of brands scale (see results attached).

Over that time I've developed a full strategy which covers everything you've described in the post, so we're on the same page. I've also attached this strategy breakdown for you

Can I ask, what % of your revenue comes from email and sms currently?

Thanks,
Sam`,
  },
];

export function buildGoodProposalsBlock(): string {
  if (GOOD_PROPOSALS.length === 0) return '';
  return `## EXAMPLES OF GOOD PROPOSALS SAM HAS SUBMITTED
Study these carefully. This is what the output should sound like — the tone, the directness, the specificity, the length. Do not copy them verbatim. Use them to calibrate your voice and style.

${GOOD_PROPOSALS.map((ex, i) => `### Example ${i + 1} — ${ex.context}
${ex.proposal}`).join('\n\n')}

What makes these good:
- Gets straight to proof with real numbers, no warm-up sentences
- References something specific from the post ("everything you've described in the post")
- Short. Every sentence does work. No filler.
- Sounds like a confident person talking, not an AI following a template
- The question is simple and invites an easy reply
- Free asset mentioned naturally, not awkwardly forced in
`;
}
