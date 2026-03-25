import { NextRequest, NextResponse } from 'next/server';
import { getProposalById, updateProposal } from '@/lib/storage';
import { generateProposal } from '@/lib/ai/proposal-writer';

export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { extraContext } = await req.json();

    const proposal = await getProposalById(id);
    if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const newSections = await generateProposal(proposal.extractedData, proposal.pricing, extraContext);

    // Preserve user-curated fields that shouldn't be overwritten by AI
    const mergedSections = {
      ...newSections,
      consultantImages: proposal.sections.consultantImages,
      officeImages: proposal.sections.officeImages,
      headlines: proposal.sections.headlines,
      hiddenSections: proposal.sections.hiddenSections,
    };

    const updated = await updateProposal(id, {
      sections: mergedSections,
      extraContext: extraContext ?? '',
    });

    return NextResponse.json({ proposal: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Rewrite failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
