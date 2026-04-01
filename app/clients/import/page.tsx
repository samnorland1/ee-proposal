'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClientType } from '@/types';
import * as XLSX from 'xlsx';

type FieldMapping = {
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  country: string;
  clientType: string;
  source: string;
};

const CLIENT_FIELDS = [
  { key: 'firstName', label: 'First Name', required: false },
  { key: 'lastName', label: 'Last Name', required: false },
  { key: 'email', label: 'Email', required: true },
  { key: 'businessName', label: 'Business Name', required: false },
  { key: 'country', label: 'Country', required: false },
  { key: 'clientType', label: 'Type (B2B/B2C)', required: false },
  { key: 'source', label: 'Source', required: false },
] as const;

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);

  return { headers, rows };
}

function parseExcel(buffer: ArrayBuffer): { headers: string[]; rows: string[][] } {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });

  if (data.length === 0) return { headers: [], rows: [] };

  const headers = (data[0] || []).map(h => String(h || ''));
  const rows = data.slice(1).map(row =>
    (row || []).map(cell => String(cell || ''))
  );

  return { headers, rows };
}

export default function ImportClientsPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({
    firstName: '',
    lastName: '',
    email: '',
    businessName: '',
    country: '',
    clientType: '',
    source: '',
  });
  const [defaultType, setDefaultType] = useState<ClientType>('B2B');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [error, setError] = useState('');

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setError('');

    try {
      let h: string[] = [];
      let r: string[][] = [];

      const isExcel = f.name.endsWith('.xlsx') || f.name.endsWith('.xls');

      if (isExcel) {
        const buffer = await f.arrayBuffer();
        const parsed = parseExcel(buffer);
        h = parsed.headers;
        r = parsed.rows;
      } else {
        const text = await f.text();
        const parsed = parseCSV(text);
        h = parsed.headers;
        r = parsed.rows;
      }

      if (h.length === 0) {
        setError('Could not parse file - no headers found');
        return;
      }

      // Filter out empty rows
      r = r.filter(row => row.some(cell => cell.trim()));

      setHeaders(h);
      setRows(r);

      // Auto-map fields based on header names
      const autoMapping: FieldMapping = { ...mapping };
      const lowerHeaders = h.map(x => x.toLowerCase());

      const findMatch = (patterns: string[]): string => {
        for (const pattern of patterns) {
          const idx = lowerHeaders.findIndex(x => x.includes(pattern));
          if (idx !== -1) return h[idx];
        }
        return '';
      };

      autoMapping.firstName = findMatch(['first name', 'firstname', 'first_name', 'given name']);
      autoMapping.lastName = findMatch(['last name', 'lastname', 'last_name', 'surname', 'family name']);
      autoMapping.email = findMatch(['email', 'e-mail', 'mail']);
      autoMapping.businessName = findMatch(['business', 'company', 'organization', 'organisation']);
      autoMapping.country = findMatch(['country', 'location', 'region']);
      autoMapping.clientType = findMatch(['type', 'client type', 'clienttype']);
      autoMapping.source = findMatch(['source', 'lead source', 'referral']);

      // If no first name found but there's a "name" or "full name" column
      if (!autoMapping.firstName) {
        autoMapping.firstName = findMatch(['full name', 'name', 'contact']);
      }

      setMapping(autoMapping);
      setStep(2);
    } catch {
      setError('Failed to read file');
    }
  }, [mapping]);

  const handleImport = async () => {
    if (!mapping.email) {
      setError('Email mapping is required');
      return;
    }

    setImporting(true);
    setError('');

    let success = 0;
    let failed = 0;

    for (const row of rows) {
      const getValue = (field: keyof FieldMapping): string => {
        const header = mapping[field];
        if (!header) return '';
        const idx = headers.indexOf(header);
        return idx !== -1 ? row[idx] || '' : '';
      };

      const email = getValue('email');

      if (!email) {
        failed++;
        continue;
      }

      let clientType = getValue('clientType').toUpperCase();
      if (clientType !== 'B2B' && clientType !== 'B2C') {
        clientType = defaultType;
      }

      try {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: getValue('firstName'),
            lastName: getValue('lastName'),
            email,
            businessName: getValue('businessName'),
            country: getValue('country'),
            clientType,
            source: getValue('source'),
          }),
        });

        if (res.ok) {
          success++;
        } else {
          const errData = await res.json();
          console.error('Import failed for', email, errData);
          failed++;
        }
      } catch (err) {
        console.error('Import error for', email, err);
        failed++;
      }
    }

    setResult({ success, failed });
    setStep(3);
    setImporting(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/clients" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to clients
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Import Clients</h2>
        <p className="text-sm text-gray-500 mt-0.5">Upload a CSV or Excel file and map columns to fields</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= s ? 'bg-[#02210C] text-white' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s}
            </div>
            {s < 3 && <div className={`h-px w-8 ${step > s ? 'bg-[#02210C]' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">
          {step === 1 && 'Upload file'}
          {step === 2 && 'Map fields'}
          {step === 3 && 'Done'}
        </span>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 mb-2">Upload a CSV or Excel file</p>
            <label
              htmlFor="file-upload"
              className="inline-block px-4 py-2 bg-[#02210C] text-white text-sm font-medium rounded-lg hover:bg-[#033a12] cursor-pointer transition-colors"
            >
              Choose File
            </label>
            <p className="text-xs text-gray-400 mt-3">
              Supports .csv, .xlsx, .xls - First row should contain column headers
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Map Fields */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Map Columns to Fields</h3>
              <span className="text-sm text-gray-500">{rows.length} rows found</span>
            </div>

            <div className="space-y-4">
              {CLIENT_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-4">
                  <label className="w-40 text-sm font-medium text-gray-700 flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={mapping[field.key as keyof FieldMapping]}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#02210C]/20 focus:border-[#02210C]"
                  >
                    <option value="">-- Don&apos;t import --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Type (if not mapped or invalid)
              </label>
              <div className="flex gap-2">
                {(['B2B', 'B2C'] as ClientType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDefaultType(t)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      defaultType === t
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

          {/* Preview */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Preview (first 5 rows)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">First Name</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Last Name</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Email</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Business</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => {
                    const getValue = (field: keyof FieldMapping) => {
                      const header = mapping[field];
                      if (!header) return '-';
                      const idx = headers.indexOf(header);
                      return idx !== -1 ? row[idx] || '-' : '-';
                    };
                    return (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 px-2 text-gray-900">{getValue('firstName')}</td>
                        <td className="py-2 px-2 text-gray-600">{getValue('lastName')}</td>
                        <td className="py-2 px-2 text-gray-600">{getValue('email')}</td>
                        <td className="py-2 px-2 text-gray-600">{getValue('businessName')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-gray-600 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex-1 bg-[#02210C] text-white font-medium py-2.5 rounded-lg hover:bg-[#033a12] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? `Importing ${rows.length} clients...` : `Import ${rows.length} Clients`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && result && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Import Complete</h3>
          <p className="text-gray-600 mb-6">
            Successfully imported <span className="font-semibold text-green-600">{result.success}</span> clients
            {result.failed > 0 && (
              <>, <span className="font-semibold text-red-600">{result.failed}</span> failed</>
            )}
          </p>
          <Link
            href="/clients"
            className="inline-block px-6 py-2.5 bg-[#02210C] text-white font-medium rounded-lg hover:bg-[#033a12] transition-colors"
          >
            View Clients
          </Link>
        </div>
      )}
    </div>
  );
}
