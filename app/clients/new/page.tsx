'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ComboBox } from '@/components/combo-box';
import { ClientType } from '@/types';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);

  const [country, setCountry] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [clientType, setClientType] = useState<ClientType>('B2B');
  const [source, setSource] = useState('');
  const [isCurrent, setIsCurrent] = useState(true);

  useEffect(() => {
    fetch('/api/clients/options')
      .then((res) => res.json())
      .then((data) => {
        setCountries(data.countries ?? []);
        setSources(data.sources ?? []);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country,
          businessName,
          firstName,
          lastName,
          email,
          clientType,
          source,
          isCurrent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create client');

      router.push(`/clients/${data.client.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create client');
      setLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/clients" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to clients
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">New Client</h2>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Business Name
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#02210C]/20 focus:border-[#02210C]"
            placeholder="Acme Inc."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#02210C]/20 focus:border-[#02210C]"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#02210C]/20 focus:border-[#02210C]"
              placeholder="Smith"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#02210C]/20 focus:border-[#02210C]"
            placeholder="john@acme.com"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Country
            </label>
            <ComboBox
              value={country}
              onChange={setCountry}
              options={countries}
              placeholder="Select or type country"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {(['B2B', 'B2C'] as ClientType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setClientType(t)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    clientType === t
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
            value={source}
            onChange={setSource}
            options={sources}
            placeholder="How did they find you?"
          />
        </div>

        <div className="flex items-center gap-4 py-3">
          <button
            type="button"
            onClick={() => setIsCurrent(!isCurrent)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isCurrent ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isCurrent ? 'translate-x-[22px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
          <div>
            <label className="text-sm font-medium text-gray-700">Current Client</label>
            <p className="text-xs text-gray-500">Is this an active/current client?</p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#02210C] text-white font-medium py-2.5 rounded-lg hover:bg-[#033a12] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Client'}
          </button>
        </div>
      </form>
    </div>
  );
}
