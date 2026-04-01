import { getAllClients } from '@/lib/clients';
import Link from 'next/link';
import { ClientList } from './client-list';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const clients = await getAllClients();

  return (
    <div className="p-4 md:p-8 max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-6 gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 truncate">Clients</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/clients/import"
            className="text-gray-600 text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="hidden sm:inline">Import</span>
          </Link>
          <Link
            href="/clients/new"
            className="bg-[#02210C] text-white text-sm font-medium px-3 py-2 md:px-4 rounded-lg hover:bg-[#033a12] transition-colors flex items-center gap-1.5 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New Client</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </div>

      <ClientList clients={clients} />
    </div>
  );
}
