'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Booking, Guest, Site, Zone } from '@/lib/types';
import BookingQueue from './BookingQueue';

interface BookingsShellProps {
  bookings: Booking[];
  guests: Guest[];
  sites: Site[];
  zones: Zone[];
}

export default function BookingsShell({
  bookings,
  guests,
  sites,
  zones,
}: BookingsShellProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const guestMap = useMemo(
    () => new Map(guests.map((g) => [g.id, g])),
    [guests],
  );

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (search) {
        const guest = guestMap.get(b.guest_id);
        const q = search.toLowerCase();
        if (
          !guest?.name.toLowerCase().includes(q) &&
          !guest?.email.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      // Exclude bookings that depart before dateFrom or arrive after dateTo
      if (dateFrom && b.departure < dateFrom) return false;
      if (dateTo && b.arrival > dateTo) return false;
      return true;
    });
  }, [bookings, search, dateFrom, dateTo, guestMap]);

  async function onAction(
    id: string,
    action: 'approve' | 'decline' | 'reassign',
    extra?: { new_site_id?: string },
  ) {
    await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    });
    router.refresh();
  }

  const hasFilter = search || dateFrom || dateTo;

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search guest name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {hasFilter && (
          <button
            onClick={() => {
              setSearch('');
              setDateFrom('');
              setDateTo('');
            }}
            className="text-sm text-gray-400 hover:text-gray-700 transition"
          >
            Clear
          </button>
        )}
      </div>

      <BookingQueue
        bookings={filtered}
        guests={guests}
        sites={sites}
        zones={zones}
        onAction={onAction}
      />
    </>
  );
}
