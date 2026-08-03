# Proposal Chase SOP

## How it works

Every proposal marked "Sent" gets a follow-up chase email sent to your Gmail automatically. The cron runs daily at 9am UTC and generates personalized copy for each proposal based on the original proposal context. You just copy, paste, and send.

## Chase schedule

| Day | Chase | Goal |
|-----|-------|------|
| Day 3 | Chase 1 — 3-Day Chase | See if they had questions about the proposal |
| Day 6 | Chase 2 — 6-Day Chase | Give something of value (tip/insight specific to their situation) |
| Day 9+ | Chase 3 — Final Chase | Suggest a quick call |

After Day 9 the cron continues to fire every 3 days with a Final Chase until the proposal is marked Won or Lost.

## What you receive

A single email with all chases due that day. Each section includes:
- Client name, chase stage, days since sent
- Project and price summary
- Ready-to-send copy (AI-generated, personalized from the original proposal)
- Link to the proposal

## Kanban columns

The All Proposals board has 7 columns. Drag proposals manually as you send each chase:

**Draft → Sent → 3-Day Chase → 6-Day Chase → Final Chase → Won / Lost**

This gives you a visual pipeline showing exactly where every deal sits.

## Copy rules (enforced by AI)

- Under 80 words
- No em dashes, no fragments
- Nonchalant — not desperate or needy
- Always ties back to the outcome they want
- Hint of urgency, easy next step implied

## Chase copy framework

- **Chase 1:** Did they have questions? Reference what they want to achieve. Easy next step.
- **Chase 2:** Give something valuable — specific insight or tip for their exact situation. Ask one direct question (no "can I ask"). Tie to outcome.
- **Chase 3:** Suggest a quick call. Low commitment. Reference the outcome. Light urgency.

## Automatic for all proposals

Every new proposal marked "Sent" is automatically picked up by the cron. No setup needed — just mark it sent and the chases will fire on schedule.

## Tech

- Cron: `vercel.json` — `/api/cron/follow-up-reminders` at `0 9 * * *` (9am UTC daily)
- Email: Resend via `ai@emailevolution.online`
- Copy generation: Claude Opus
- Triggered by: `sentAt` timestamp on the proposal record
