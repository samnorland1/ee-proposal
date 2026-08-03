import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { extractFromTranscript } from '@/lib/ai/extraction';
import { generateProposal, generateProjectTitle } from '@/lib/ai/proposal-writer';
import { generateAIThinking } from '@/lib/ai/thinking';
import { createProposal } from '@/lib/storage';
import { findRelevantScreenshots, generateCaptions } from '@/lib/screenshots';
import { Proposal } from '@/types';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const {
      clientName,
      clientContact,
      clientEmail,
      serviceDescription,
      problems,
      currentTools,
      timeline,
      pricing,
      extraContext,
    } = await req.json();

    if (!clientName || !clientContact || !serviceDescription || !problems || !pricing) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Build synthetic transcript from form inputs
    const transcriptLines = [
      `Client: ${clientName}`,
      `Contact: ${clientContact}`,
      clientEmail ? `Email: ${clientEmail}` : null,
      '',
      'What they need:',
      serviceDescription,
      '',
      'Main challenges and pain points:',
      problems,
      currentTools ? `\nCurrent tools and platforms: ${currentTools}` : null,
      timeline ? `Timeline: ${timeline}` : null,
    ];
    const transcript = transcriptLines.filter((l) => l !== null).join('\n').trim();

    // Extract structured data from the synthetic transcript
    const extractedData = await extractFromTranscript(transcript, extraContext);

    // Override client identity with exactly what was entered
    extractedData.client_name = clientName;
    extractedData.client_contact = clientContact;
    if (clientEmail) extractedData.client_email = clientEmail;

    // Generate proposal sections, title, and AI thinking in parallel
    const [sections, projectTitle, aiThinking] = await Promise.all([
      generateProposal(extractedData, pricing, extraContext),
      generateProjectTitle(extractedData),
      generateAIThinking(extractedData, transcript),
    ]);

    // Screenshot matching
    const screenshotKeywords = [
      extractedData.service_type,
      ...extractedData.technical_context.current_tools,
      ...extractedData.project_scope,
    ].filter(Boolean);
    const screenshots = findRelevantScreenshots(screenshotKeywords);
    const screenshotCaptions = await generateCaptions(screenshots);

    const id = uuidv4();
    const proposal: Proposal = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      notionPageId: `manual:${id}`,
      notionUrl: '',
      clientName: extractedData.client_name,
      clientEmail: extractedData.client_email || clientEmail || '',
      clientContact: extractedData.client_contact,
      pricing,
      projectTitle,
      extraContext: extraContext || undefined,
      extractedData,
      sections,
      aiThinking,
      screenshots,
      screenshotCaptions,
    };

    await createProposal(proposal);
    return NextResponse.json({ proposal });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
