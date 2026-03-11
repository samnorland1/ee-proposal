import { NextRequest, NextResponse } from 'next/server';
import { getProposalById } from '@/lib/storage';
import { renderToBuffer, DocumentProps } from '@react-pdf/renderer';
import { createElement, ReactElement } from 'react';
import { ProposalPDF } from '@/components/pdf/proposal-pdf';
import { screenshotToAbsPath } from '@/lib/screenshots';
import fs from 'fs';
import path from 'path';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proposal = await getProposalById(id);
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const avatarPath = path.join(process.cwd(), 'public', 'Circle Headshots.png');
    const avatar = fs.existsSync(avatarPath) ? avatarPath : null;

    const screenshotAbsPaths = (proposal.screenshots ?? [])
      .map(screenshotToAbsPath)
      .filter((p) => fs.existsSync(p));

    const screenshotCaptions = proposal.screenshotCaptions ?? {};
    const element = createElement(ProposalPDF, { proposal, avatarPath: avatar, screenshotAbsPaths, screenshotCaptions }) as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);
    const filename = `Proposal - ${proposal.clientName.replace(/[^a-zA-Z0-9 ]/g, '')}.pdf`;

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PDF generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
