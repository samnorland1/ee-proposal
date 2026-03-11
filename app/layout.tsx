import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Proposals',
  description: 'Freelancer proposal generator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-56 bg-[#1a2744] text-white flex flex-col shrink-0">
            <div className="px-5 py-6 border-b border-white/10">
              <p className="text-xs font-semibold tracking-widest uppercase text-white/50 mb-1">
                Sam Norland
              </p>
              <h1 className="text-lg font-bold tracking-tight">Proposals</h1>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              <a
                href="/proposals"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                All Proposals
              </a>
              <a
                href="/new"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Proposal
              </a>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
