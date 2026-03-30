import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getTranscriptById, updateTranscriptStatus } from '@/lib/notion';
import { extractFromTranscript } from '@/lib/ai/extraction';
import { generateProposal, generateProjectTitle } from '@/lib/ai/proposal-writer';
import { createProposal } from '@/lib/storage';
import { findRelevantScreenshots, generateCaptions } from '@/lib/screenshots';
import { Proposal } from '@/types';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { pageId, pricing, extraContext } = await req.json();
    if (!pageId || !pricing) {
      return NextResponse.json({ error: 'pageId and pricing are required' }, { status: 400 });
    }

    // Step 1: Fetch transcript from Notion
    const transcript = await getTranscriptById(pageId);
    if (!transcript.transcript) {
      return NextResponse.json({ error: 'No transcript content found on this Notion page' }, { status: 400 });
    }

    // Step 2: Extract structured data (include extra context if provided)
    const extractedData = await extractFromTranscript(transcript.transcript, extraContext);

    // Step 3: Generate proposal sections + project title in parallel
    const [sections, projectTitle] = await Promise.all([
      generateProposal(extractedData, pricing, extraContext),
      generateProjectTitle(extractedData),
    ]);

    // Step 4: Find relevant screenshots from public/screenshots/
    const screenshotKeywords = [
      extractedData.service_type,
      ...extractedData.technical_context.current_tools,
      ...extractedData.project_scope,
    ].filter(Boolean);
    const screenshots = findRelevantScreenshots(screenshotKeywords);
    const screenshotCaptions = await generateCaptions(screenshots);

    // Step 5: Build and save proposal
    const proposal: Proposal = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      notionPageId: pageId,
      notionUrl: transcript.notionUrl,
      clientName: extractedData.client_name || transcript.clientName,
      clientEmail: extractedData.client_email || transcript.clientEmail,
      clientContact: extractedData.client_contact || transcript.clientContact,
      pricing,
      projectTitle,
      extraContext: extraContext || undefined,
      extractedData,
      sections,
      screenshots,
      screenshotCaptions,
    };
    await createProposal(proposal);

    // Step 6: Update Notion status
    try {
      await updateTranscriptStatus(pageId, 'Proposal Generated');
    } catch {
      // Non-fatal — don't fail the whole request if Notion update fails
    }

    return NextResponse.json({ proposal });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
