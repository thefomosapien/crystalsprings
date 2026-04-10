'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CampgroundMap from '@/components/map/CampgroundMap';
import { ScoredSite } from '@/lib/optimizer';
import { Booking, Guest, Site, Zone } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toScoredSites(sites: Site[]): ScoredSite[] {
  return sites.map((s) => ({
    ...s,
    urgency_score: 0,
    dynamic_rate: s.base_rate,
    badge: null,
  }));
}

function todayDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 86_400_000);
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtMoney(n: number | null) {
  if (n === null) return '—';
  return `$${n.toLocaleString()}`;
}

const HOOKUP_LABEL: Record<string, string> = {
  none: 'No hookups',
  water: 'Water',
  electric_30a: '30A Electric',
  electric_50a: '50A Electric',
  full: 'Full hookups',
  full_sewer: 'Full + Sewer',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AdminMapClientProps {
  sites: Site[];
  zones: Zone[];
  bookings: Booking[];
  guests: Guest[];
}

export default function AdminMapClient({
  sites,
  zones,
  bookings,
  guests,
}: AdminMapClientProps) {
  const router = useRouter();

  const defaultArrival = toDateStr(todayDate());
  const defaultDeparture = toDateStr(addDays(todayDate(), 7));

  const [arrival, setArrival] = useState(defaultArrival);
  const [departure, setDeparture] = useState(defaultDeparture);
  const [selected, setSelected] = useState<Site | null>(null);
  const [acting, setActing] = useState(false);

  const scoredSites = useMemo(() => toScoredSites(sites), [sites]);

  const selectedDates = useMemo(
    () => ({
      arrival: new Date(arrival + 'T00:00:00'),
      departure: new Date(departure + 'T00:00:00'),
    }),
    [arrival, departure],
  );

  const zone = useMemo(
    () => (selected ? zones.find((z) => z.id === selected.zone_id) : null),
    [selected, zones],
  );

  // Booking overlapping the selected date window for the selected site
  const activeBooking = useMemo(() => {
    if (!selected) return null;
    return (
      bookings.find(
        (b) =>
          b.site_id === selected.id &&
          (b.status === 'approved' || b.status === 'pending') &&
          new Date(b.arrival + 'T00:00:00') < selectedDates.departure &&
          new Date(b.departure + 'T00:00:00') > selectedDates.arrival,
      ) ?? null
    );
  }, [selected, bookings, selectedDates]);

  const activeGuest = useMemo(
    () =>
      activeBooking ? guests.find((g) => g.id === activeBooking.guest_id) ?? null : null,
    [activeBooking, guests],
  );

  async function handleAction(action: 'approve' | 'decline', bookingId: string) {
    setActing(true);
    try {
      await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="flex gap-6 items-start">
      {/* Left: controls + map */}
      <div className="flex-1 min-w-0">
        {/* Date range */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-sm text-gray-500 font-medium">Show occupancy for:</span>
          <input
            type="date"
            value={arrival}
            max={departure}
            onChange={(e) => setArrival(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="date"
            value={departure}
            min={arrival}
            onChange={(e) => setDeparture(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Legend */}
        <div className="flex gap-5 text-xs text-gray-500 mb-3">
          {[
            { color: '#639922', label: 'Available' },
            { color: '#EF9F27', label: 'Pending' },
            { color: '#F09595', label: 'Booked' },
            { color: '#B4B2A9', label: 'Declined' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: color }}
              />
              {label}
            </span>
          ))}
        </div>

        <CampgroundMap
          sites={scoredSites}
          bookings={bookings}
          zones={zones}
          guests={guests}
          mode="admin"
          selectedDates={selectedDates}
          onSiteClick={(site) => setSelected(site)}
        />
      </div>

      {/* Right: detail panel */}
      {selected && (
        <div className="w-72 shrink-0 bg-white border border-gray-200 rounded-xl p-5 sticky top-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">{selected.name}</h3>
              {zone && <p className="text-xs text-gray-400">{zone.name}</p>}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-2"
              aria-label="Close panel"
            >
              ×
            </button>
          </div>

          {/* Site details */}
          <dl className="space-y-1.5 text-sm mb-4">
            <div className="flex justify-between">
              <dt className="text-gray-500">Type</dt>
              <dd className="font-medium capitalize">{selected.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Hookups</dt>
              <dd className="font-medium">
                {HOOKUP_LABEL[selected.hookups ?? 'none'] ?? '—'}
              </dd>
            </div>
            {selected.max_people && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Max guests</dt>
                <dd className="font-medium">{selected.max_people}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Base rate</dt>
              <dd className="font-medium">{fmtMoney(selected.base_rate)}/night</dd>
            </div>
          </dl>

          {/* Active booking */}
          <div className="border-t border-gray-100 pt-4">
            {activeBooking ? (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Booking in window
                </p>

                <p className="font-medium text-sm text-gray-900">
                  {activeGuest?.name ?? '—'}
                </p>
                <p className="text-xs text-gray-400 mb-2">{activeGuest?.email}</p>

                <p className="text-xs text-gray-500">
                  {fmtDate(activeBooking.arrival)} – {fmtDate(activeBooking.departure)}
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  Party: {activeBooking.party_size ?? '—'} · Total:{' '}
                  {fmtMoney(activeBooking.total)}
                </p>

                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-3 ${
                    STATUS_BADGE[activeBooking.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {activeBooking.status}
                </span>

                <div className="flex flex-col gap-1.5">
                  {activeBooking.status === 'pending' && (
                    <>
                      <button
                        disabled={acting}
                        onClick={() => handleAction('approve', activeBooking.id)}
                        className="w-full py-1.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 hover:bg-emerald-200 disabled:opacity-50 transition"
                      >
                        Approve
                      </button>
                      <button
                        disabled={acting}
                        onClick={() => handleAction('decline', activeBooking.id)}
                        className="w-full py-1.5 rounded text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50 transition"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {activeBooking.status === 'approved' && (
                    <button
                      disabled={acting}
                      onClick={() => handleAction('decline', activeBooking.id)}
                      className="w-full py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition"
                    >
                      Cancel booking
                    </button>
                  )}
                  <Link
                    href={`/bookings?id=${activeBooking.id}`}
                    className="w-full py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-center"
                  >
                    View full booking
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">No booking for this date range.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
