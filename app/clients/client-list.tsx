'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Client, ClientType } from '@/types';

type EditingValues = {
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  country: string;
  clientType: ClientType;
  source: string;
};

const COLUMNS = [
  { key: 'name', label: 'Name', defaultWidth: 180 },
  { key: 'email', label: 'Email', defaultWidth: 220 },
  { key: 'businessName', label: 'Business', defaultWidth: 160 },
  { key: 'country', label: 'Country', defaultWidth: 120 },
  { key: 'type', label: 'Type', defaultWidth: 80 },
  { key: 'source', label: 'Source', defaultWidth: 120 },
  { key: 'documents', label: 'Docs', defaultWidth: 60 },
  { key: 'created', label: 'Created', defaultWidth: 100 },
] as const;

type ColumnKey = (typeof COLUMNS)[number]['key'];

function TypeBadge({ type }: { type: ClientType }) {
  const styles: Record<ClientType, string> = {
    B2B: 'bg-blue-50 text-blue-700',
    B2C: 'bg-purple-50 text-purple-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[type]}`}>
      {type}
    </span>
  );
}


export function ClientList({ clients: initialClients }: { clients: Client[] }) {
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all');
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(COLUMNS.map(c => c.key)));
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(
    Object.fromEntries(COLUMNS.map(c => [c.key, c.defaultWidth])) as Record<ColumnKey, number>
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ key: ColumnKey; startX: number; startWidth: number } | null>(null);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditingValues | null>(null);
  const [saving, setSaving] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkValues, setBulkValues] = useState<Partial<EditingValues>>({});

  // Load saved preferences - reset if version mismatch
  useEffect(() => {
    const version = localStorage.getItem('client-columns-version');
    if (version !== '3') {
      localStorage.removeItem('client-columns');
      localStorage.removeItem('client-column-widths');
      localStorage.setItem('client-columns-version', '3');
      return;
    }
    const savedCols = localStorage.getItem('client-columns');
    if (savedCols) {
      try {
        setVisibleColumns(new Set(JSON.parse(savedCols)));
      } catch {}
    }
    const savedWidths = localStorage.getItem('client-column-widths');
    if (savedWidths) {
      try {
        setColumnWidths(prev => ({ ...prev, ...JSON.parse(savedWidths) }));
      } catch {}
    }
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('client-columns', JSON.stringify([...visibleColumns]));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('client-column-widths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setShowColumnMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Handle column resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { key, startX, startWidth } = resizingRef.current;
    const diff = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + diff);
    setColumnWidths(prev => ({ ...prev, [key]: newWidth }));
  }, []);

  const handleMouseUp = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  const startResize = (key: ColumnKey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { key, startX: e.clientX, startWidth: columnWidths[key] };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const toggleColumn = (key: ColumnKey) => {
    const next = new Set(visibleColumns);
    if (next.has(key)) {
      if (next.size > 1) next.delete(key);
    } else {
      next.add(key);
    }
    setVisibleColumns(next);
  };

  // Inline editing functions
  const startEditing = (client: Client) => {
    setEditingId(client.id);
    setEditValues({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      businessName: client.businessName || '',
      country: client.country || '',
      clientType: client.clientType,
      source: client.source || '',
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const saveEditing = async () => {
    if (!editingId || !editValues) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues),
      });
      if (res.ok) {
        const { client } = await res.json();
        setClients(prev => prev.map(c => c.id === editingId ? client : c));
        setEditingId(null);
        setEditValues(null);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  // Bulk selection functions
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const cancelBulkEdit = () => {
    setBulkEditMode(false);
    setBulkValues({});
  };

  const saveBulkEdit = async () => {
    if (selectedIds.size === 0 || Object.keys(bulkValues).length === 0) return;
    setSaving(true);
    try {
      const updates = Array.from(selectedIds).map(id =>
        fetch(`/api/clients/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bulkValues),
        }).then(res => res.ok ? res.json() : null)
      );
      const results = await Promise.all(updates);
      const updated = results.filter(r => r?.client).map(r => r.client);
      setClients(prev => prev.map(c => {
        const u = updated.find((x: Client) => x.id === c.id);
        return u || c;
      }));
      setSelectedIds(new Set());
      setBulkEditMode(false);
      setBulkValues({});
    } catch (err) {
      console.error('Bulk edit failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = clients.filter((c) => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const matchesSearch =
      (c.businessName?.toLowerCase() || '').includes(search.toLowerCase()) ||
      fullName.includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || c.clientType === typeFilter;
    return matchesSearch && matchesType;
  });

  const visibleCols = COLUMNS.filter(c => visibleColumns.has(c.key));

  if (clients.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p className="text-gray-500 font-medium">No clients yet</p>
        <Link href="/clients/new" className="text-[#02210C] font-medium text-sm underline underline-offset-2 mt-2 inline-block">
          Add your first client
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#02210C]/20 focus:border-[#02210C]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'B2B', 'B2C'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                typeFilter === t
                  ? 'bg-[#02210C] text-white border-[#02210C]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}

          {/* Columns dropdown */}
          <div className="relative" ref={columnMenuRef}>
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Columns
            </button>
            {showColumnMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                {COLUMNS.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className={`w-4 h-4 border rounded flex items-center justify-center ${
                      visibleColumns.has(col.key) ? 'bg-[#02210C] border-[#02210C]' : 'border-gray-300'
                    }`}>
                      {visibleColumns.has(col.key) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {col.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results count & bulk edit bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {filtered.length} client{filtered.length !== 1 ? 's' : ''}
          {search && ` matching "${search}"`}
          {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
        </p>
        {selectedIds.size > 0 && !bulkEditMode && (
          <button
            onClick={() => setBulkEditMode(true)}
            className="px-3 py-1.5 text-sm font-medium bg-[#02210C] text-white rounded-lg hover:bg-[#033a12] transition-colors"
          >
            Edit Selected
          </button>
        )}
      </div>

      {/* Bulk edit panel */}
      {bulkEditMode && selectedIds.size > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Bulk edit {selectedIds.size} client{selectedIds.size !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Country</label>
              <input
                type="text"
                placeholder="Leave empty to skip"
                value={bulkValues.country || ''}
                onChange={(e) => setBulkValues({ ...bulkValues, country: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02210C]/20"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select
                value={bulkValues.clientType || ''}
                onChange={(e) => setBulkValues({ ...bulkValues, clientType: e.target.value as ClientType || undefined })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02210C]/20"
              >
                <option value="">Skip</option>
                <option value="B2B">B2B</option>
                <option value="B2C">B2C</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Source</label>
              <input
                type="text"
                placeholder="Leave empty to skip"
                value={bulkValues.source || ''}
                onChange={(e) => setBulkValues({ ...bulkValues, source: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02210C]/20"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveBulkEdit}
              disabled={saving || Object.keys(bulkValues).every(k => !bulkValues[k as keyof typeof bulkValues])}
              className="px-3 py-1.5 text-sm font-medium bg-[#02210C] text-white rounded-lg hover:bg-[#033a12] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Apply to Selected'}
            </button>
            <button
              onClick={cancelBulkEdit}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">No clients match your filters</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: visibleCols.reduce((sum, c) => sum + columnWidths[c.key], 0) }}>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={selectAll}
                      className="w-4 h-4 rounded border-gray-300 text-[#02210C] focus:ring-[#02210C]"
                    />
                  </th>
                  {visibleCols.map((col, i) => (
                    <th
                      key={col.key}
                      className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 relative select-none"
                      style={{ width: columnWidths[col.key], minWidth: 50 }}
                    >
                      {col.label}
                      {i < visibleCols.length - 1 && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#02210C]/20 group"
                          onMouseDown={(e) => startResize(col.key, e)}
                        >
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-[#02210C]" />
                        </div>
                      )}
                    </th>
                  ))}
                  <th className="w-24 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((client) => {
                  const isEditing = editingId === client.id;
                  const isSelected = selectedIds.has(client.id);

                  return (
                    <tr
                      key={client.id}
                      className={`transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(client.id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#02210C] focus:ring-[#02210C]"
                        />
                      </td>
                      {visibleColumns.has('name') && (
                        <td className="px-4 py-3" style={{ width: columnWidths.name }}>
                          {isEditing ? (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={editValues?.firstName || ''}
                                onChange={(e) => setEditValues(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                                placeholder="First"
                                className="w-1/2 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#02210C]/20"
                              />
                              <input
                                type="text"
                                value={editValues?.lastName || ''}
                                onChange={(e) => setEditValues(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                                placeholder="Last"
                                className="w-1/2 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#02210C]/20"
                              />
                            </div>
                          ) : (
                            <Link href={`/clients/${client.id}`} className="font-medium text-gray-900 hover:text-[#02210C]">
                              {client.firstName} {client.lastName}
                            </Link>
                          )}
                        </td>
                      )}
                      {visibleColumns.has('email') && (
                        <td className="px-4 py-3" style={{ width: columnWidths.email }}>
                          {isEditing ? (
                            <input
                              type="email"
                              value={editValues?.email || ''}
                              onChange={(e) => setEditValues(prev => prev ? { ...prev, email: e.target.value } : null)}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#02210C]/20"
                            />
                          ) : (
                            <span className="text-sm text-gray-600 truncate block">{client.email}</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.has('businessName') && (
                        <td className="px-4 py-3" style={{ width: columnWidths.businessName }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues?.businessName || ''}
                              onChange={(e) => setEditValues(prev => prev ? { ...prev, businessName: e.target.value } : null)}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#02210C]/20"
                            />
                          ) : (
                            <span className="text-sm text-gray-600 truncate block">{client.businessName || '-'}</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.has('country') && (
                        <td className="px-4 py-3" style={{ width: columnWidths.country }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues?.country || ''}
                              onChange={(e) => setEditValues(prev => prev ? { ...prev, country: e.target.value } : null)}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#02210C]/20"
                            />
                          ) : (
                            <span className="text-sm text-gray-600">{client.country || '-'}</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.has('type') && (
                        <td className="px-4 py-3" style={{ width: columnWidths.type }}>
                          {isEditing ? (
                            <select
                              value={editValues?.clientType || 'B2B'}
                              onChange={(e) => setEditValues(prev => prev ? { ...prev, clientType: e.target.value as ClientType } : null)}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#02210C]/20"
                            >
                              <option value="B2B">B2B</option>
                              <option value="B2C">B2C</option>
                            </select>
                          ) : (
                            <TypeBadge type={client.clientType} />
                          )}
                        </td>
                      )}
                      {visibleColumns.has('source') && (
                        <td className="px-4 py-3" style={{ width: columnWidths.source }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues?.source || ''}
                              onChange={(e) => setEditValues(prev => prev ? { ...prev, source: e.target.value } : null)}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#02210C]/20"
                            />
                          ) : (
                            <span className="text-sm text-gray-500 truncate block">{client.source || '-'}</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.has('documents') && (
                        <td className="px-4 py-3" style={{ width: columnWidths.documents }}>
                          <span className="text-sm text-gray-500">
                            {client.documents.length > 0 ? client.documents.length : '-'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.has('created') && (
                        <td className="px-4 py-3" style={{ width: columnWidths.created }}>
                          <span className="text-sm text-gray-500">
                            {new Date(client.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 w-24">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              onClick={saveEditing}
                              disabled={saving}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                              title="Save"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                              title="Cancel"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(client)}
                            className="p-1.5 text-gray-400 hover:text-[#02210C] hover:bg-gray-100 rounded transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
