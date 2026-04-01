'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Client, ClientType, ClientDocument, Proposal } from '@/types';
import { ComboBox } from '@/components/combo-box';
import { DocumentUpload } from '@/components/document-upload';

function TypeBadge({ type }: { type: ClientType }) {
  const styles: Record<ClientType, string> = {
    B2B: 'bg-blue-50 text-blue-700 border border-blue-200',
    B2C: 'bg-purple-50 text-purple-700 border border-purple-200',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[type]}`}>
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: Proposal['status'] }) {
  const styles: Record<Proposal['status'], string> = {
    draft: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    ready: 'bg-blue-50 text-blue-700 border border-blue-200',
    sent: 'bg-purple-50 text-purple-700 border border-purple-200',
    won: 'bg-green-100 text-green-800 border border-green-300',
    lost: 'bg-red-50 text-red-600 border border-red-200',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const [countries, setCountries] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);

  // Edit form state
  const [editCountry, setEditCountry] = useState('');
  const [editBusinessName, setEditBusinessName] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editClientType, setEditClientType] = useState<ClientType>('B2B');
  const [editSource, setEditSource] = useState('');
  const [editIsCurrent, setEditIsCurrent] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/clients/${id}`).then((r) => r.json()),
      fetch(`/api/clients/${id}/proposals`).then((r) => r.json()),
      fetch('/api/clients/options').then((r) => r.json()),
    ])
      .then(([clientData, proposalsData, optionsData]) => {
        if (clientData.error) throw new Error(clientData.error);
        setClient(clientData.client);
        setProposals(proposalsData.proposals ?? []);
        setCountries(optionsData.countries ?? []);
        setSources(optionsData.sources ?? []);

        // Initialize edit form
        const c = clientData.client;
        setEditCountry(c.country);
        setEditBusinessName(c.businessName);
        setEditFirstName(c.firstName);
        setEditLastName(c.lastName);
        setEditEmail(c.email);
        setEditClientType(c.clientType);
        setEditSource(c.source);
        setEditIsCurrent(c.isCurrent ?? true);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!editEmail) {
      setError('Email is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: editCountry,
          businessName: editBusinessName,
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
          clientType: editClientType,
          source: editSource,
          isCurrent: editIsCurrent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setClient(data.client);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this client? This will also delete all associated documents.')) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.push('/clients');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setDeleting(false);
    }
  }

  function handleDocumentUpload(doc: ClientDocument) {
    if (client) {
      setClient({ ...client, documents: [...client.documents, doc] });
    }
  }

  function handleDocumentDelete(docId: string) {
    if (client) {
      setClient({ ...client, documents: client.documents.filter((d) => d.id !== docId) });
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-[#02210C] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Client not found
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/clients" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to clients
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900">{client.businessName}</h2>
              <TypeBadge type={client.clientType} />
            </div>
            <p className="text-gray-500 mt-0.5">{client.firstName} {client.lastName}</p>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Client Details</h3>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
                  <input
                    type="text"
                    value={editBusinessName}
                    onChange={(e) => setEditBusinessName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#02210C]/20 focus:border-[#02210C]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#02210C]/20 focus:border-[#02210C]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#02210C]/20 focus:border-[#02210C]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#02210C]/20 focus:border-[#02210C]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                    <ComboBox
                      value={editCountry}
                      onChange={setEditCountry}
                      options={countries}
                      placeholder="Select or type country"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                    <div className="flex gap-2">
                      {(['B2B', 'B2C'] as ClientType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEditClientType(t)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            editClientType === t
                              ? 'bg-[#02210C] text-white border-[#02210C]'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Source</label>
                  <ComboBox
                    value={editSource}
                    onChange={setEditSource}
                    options={sources}
                    placeholder="How did they find you?"
                  />
                </div>
                <div className="flex items-center gap-4 py-3">
                  <button
                    type="button"
                    onClick={() => setEditIsCurrent(!editIsCurrent)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editIsCurrent ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        editIsCurrent ? 'translate-x-[22px]' : 'translate-x-[3px]'
                      }`}
                    />
                  </button>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Current Client</label>
                    <p className="text-xs text-gray-500">Is this an active/current client?</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-[#02210C] text-white text-sm font-medium rounded-lg hover:bg-[#033a12] transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditCountry(client.country);
                      setEditBusinessName(client.businessName);
                      setEditFirstName(client.firstName);
                      setEditLastName(client.lastName);
                      setEditEmail(client.email);
                      setEditClientType(client.clientType);
                      setEditSource(client.source);
                      setEditIsCurrent(client.isCurrent ?? true);
                    }}
                    className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Email</p>
                  <a href={`mailto:${client.email}`} className="text-sm text-[#02210C] hover:underline">
                    {client.email}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Country</p>
                  <p className="text-sm text-gray-900">{client.country}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Type</p>
                  <p className="text-sm text-gray-900">{client.clientType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Source</p>
                  <p className="text-sm text-gray-900">{client.source || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Added</p>
                  <p className="text-sm text-gray-900">
                    {new Date(client.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Documents</h3>
            <DocumentUpload
              clientId={client.id}
              documents={client.documents}
              onUpload={handleDocumentUpload}
              onDelete={handleDocumentDelete}
            />
          </div>
        </div>

        {/* Sidebar - Linked Proposals */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Linked Proposals</h3>
            {proposals.length === 0 ? (
              <p className="text-sm text-gray-400">No proposals linked to this client</p>
            ) : (
              <div className="space-y-3">
                {proposals.map((p) => (
                  <Link
                    key={p.id}
                    href={`/proposals/${p.id}`}
                    className="block p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.projectTitle || 'Untitled'}
                      </p>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(p.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
