'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'follow_up';
  proposalId: string;
  clientName: string;
  message: string;
  daysAgo: number;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load dismissed notifications from localStorage
    const saved = localStorage.getItem('dismissedNotifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDismissed(new Set(parsed));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      } catch {
        // ignore
      }
    }

    fetchNotifications();
    // Poll every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dismiss = (id: string) => {
    const newDismissed = new Set([...dismissed, id]);
    setDismissed(newDismissed);
    localStorage.setItem('dismissedNotifications', JSON.stringify([...newDismissed]));
  };

  const activeNotifications = notifications.filter((n) => !dismissed.has(n.id));
  const count = activeNotifications.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          </div>

          {activeNotifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No notifications
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {activeNotifications.map((n) => (
                <div
                  key={n.id}
                  className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0" />
                        <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">
                          Follow Up
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 font-medium truncate">{n.clientName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Proposal sent {n.daysAgo} days ago
                      </p>
                      <Link
                        href={`/proposals/${n.proposalId}`}
                        onClick={() => setOpen(false)}
                        className="text-xs text-[#02210C] hover:underline font-medium mt-1 inline-block"
                      >
                        View proposal
                      </Link>
                    </div>
                    <button
                      onClick={() => dismiss(n.id)}
                      className="text-gray-400 hover:text-gray-600 p-1 shrink-0"
                      title="Dismiss"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
