'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Booking, Guest, Site, Zone } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatDateRange(arrival: string, departure: string) {
  return `${fmt(arrival)} – ${fmt(departure)}`;
}

function fmtMoney(n: number | null) {
  if (n === null) return '—';
  return `$${n.toLocaleString()}`;
}

type Status = Booking['status'] | 'all';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-600',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BookingQueueProps {
  bookings: Booking[];
  guests: Guest[];
  sites: Site[];
  zones: Zone[];
  onAction: (
    id: string,
    action: 'approve' | 'decline' | 'reassign',
    extra?: { new_site_id?: string },
  ) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Reassign Modal
// ---------------------------------------------------------------------------

function ReassignModal({
  booking,
  sites,
  allBookings,
  onSelect,
  onClose,
}: {
  booking: Booking;
  sites: Site[];
  allBookings: Booking[];
  onSelect: (siteId: string) => void;
  onClose: () => void;
}) {
  const arrival = new Date(booking.arrival + 'T00:00:00');
  const departure = new Date(booking.departure + 'T00:00:00');

  const available = sites.filter((s) => {
    if (!s.active || s.id === booking.site_id) return false;
    return !allBookings.some(
      (b) =>
        b.id !== booking.id &&
        b.site_id === s.id &&
        (b.status === 'approved' || b.status === 'pending') &&
        new Date(b.arrival + 'T00:00:00') < departure &&
        new Date(b.departure + 'T00:00:00') > arrival,
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold mb-1">Reassign booking</h2>
        <p className="text-sm text-gray-500 mb-4">
          {formatDateRange(booking.arrival, booking.departure)} — select a new
          site
        </p>

        {available.length === 0 ? (
          <p className="text-sm text-gray-400">
            No other sites available for those dates.
          </p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {available.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => onSelect(s.id)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 text-sm transition"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-gray-500 ml-2">
                    {s.type} · ${s.base_rate}/night
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BookingQueue
// ---------------------------------------------------------------------------

export default function BookingQueue({
  bookings,
  guests,
  sites,
  zones,
  onAction,
}: BookingQueueProps) {
  const [tab, setTab] = useState<Status>('pending');
  const [acting, setActing] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState<Booking | null>(null);

  // Lookup maps
  const guestMap = new Map(guests.map((g) => [g.id, g]));
  const siteMap = new Map(sites.map((s) => [s.id, s]));
  const zoneMap = new Map(zones.map((z) => [z.id, z]));

  const TABS: { value: Status; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'declined', label: 'Declined' },
    { value: 'all', label: 'All' },
  ];

  const visible =
    tab === 'all' ? bookings : bookings.filter((b) => b.status === tab);

  async function act(
    id: string,
    action: 'approve' | 'decline' | 'reassign',
    extra?: { new_site_id?: string },
  ) {
    setActing(id);
    try {
      await onAction(id, action, extra);
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map(({ value, label }) => {
          const count =
            value === 'all'
              ? bookings.length
              : bookings.filter((b) => b.status === value).length;
          return (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                tab === value
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              <span
                className={`ml-1.5 rounded-full px-1.5 text-xs ${
                  tab === value ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Guest</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Site</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Dates</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Party</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Rate</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Total</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-400" colSpan={8}>
                  No bookings
                </td>
              </tr>
            )}
            {visible.map((booking) => {
              const guest = guestMap.get(booking.guest_id);
              const site = siteMap.get(booking.site_id);
              const zone = site ? zoneMap.get(site.zone_id) : undefined;
              const isActing = acting === booking.id;

              return (
                <tr key={booking.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{guest?.name ?? '—'}</div>
                    <div className="text-xs text-gray-400">{guest?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{site?.name ?? '—'}</div>
                    <div className="text-xs text-gray-400">{zone?.name}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDateRange(booking.arrival, booking.departure)}
                  </td>
                  <td className="px-4 py-3">{booking.party_size ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {fmtMoney(booking.rate_per_night)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    {fmtMoney(booking.total)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_BADGE[booking.status] ?? ''
                      }`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 items-center">
                      {booking.status === 'pending' && (
                        <>
                          <button
                            disabled={isActing}
                            onClick={() => act(booking.id, 'approve')}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800 hover:bg-emerald-200 disabled:opacity-50 transition"
                          >
                            Approve
                          </button>
                          <button
                            disabled={isActing}
                            onClick={() => act(booking.id, 'decline')}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50 transition"
                          >
                            Decline
                          </button>
                          <button
                            disabled={isActing}
                            onClick={() => setReassigning(booking)}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition"
                          >
                            Reassign
                          </button>
                        </>
                      )}
                      {booking.status === 'approved' && (
                        <>
                          <Link
                            href={`/bookings?id=${booking.id}`}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                          >
                            View
                          </Link>
                          <button
                            disabled={isActing}
                            onClick={() => act(booking.id, 'decline')}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {booking.status === 'declined' && (
                        <Link
                          href={`/bookings?id=${booking.id}`}
                          className="px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reassign modal */}
      {reassigning && (
        <ReassignModal
          booking={reassigning}
          sites={sites}
          allBookings={bookings}
          onSelect={(siteId) => {
            act(reassigning.id, 'reassign', { new_site_id: siteId });
            setReassigning(null);
          }}
          onClose={() => setReassigning(null)}
        />
      )}
    </div>
  );
}
