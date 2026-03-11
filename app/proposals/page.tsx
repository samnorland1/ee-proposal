import { getAllProposals } from '@/lib/storage';
import Link from 'next/link';
import { ProposalList } from './proposal-list';

export const dynamic = 'force-dynamic';

export default async function ProposalsPage() {
  const proposals = await getAllProposals();

  return (
    <div className="p-4 md:p-8 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 truncate">All Proposals</h2>
        <Link
          href="/new"
          className="bg-[#02210C] text-white text-sm font-medium px-3 py-2 md:px-4 rounded-lg hover:bg-[#033a12] transition-colors flex items-center gap-1.5 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">New Proposal</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>

      <ProposalList proposals={proposals} />
    </div>
  );
}
