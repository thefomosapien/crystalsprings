'use client';

import { ScoredSite } from '@/lib/optimizer';
import { Booking, Site, Zone } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function overlaps(b: Booking, start: Date, end: Date) {
  return new Date(b.arrival) < end && new Date(b.departure) > start;
}

function formatHookups(h: string | null) {
  if (!h) return null;
  const map: Record<string, string> = {
    none: 'No hookups',
    water: 'Water',
    electric_30a: '30A Electric',
    electric_50a: '50A Electric',
    full: 'Full hookups',
    full_sewer: 'Full + Sewer',
  };
  return map[h] ?? h;
}

function formatType(t: string) {
  return t === 'rv' ? 'RV' : t.charAt(0).toUpperCase() + t.slice(1);
}

function isAvailable(
  site: ScoredSite,
  bookings: Booking[],
  selectedDates?: { arrival: Date; departure: Date },
): boolean {
  if (!selectedDates) return true;
  return !bookings.some(
    (b) =>
      b.site_id === site.id &&
      (b.status === 'approved' || b.status === 'pending') &&
      overlaps(b, selectedDates.arrival, selectedDates.departure),
  );
}

// ---------------------------------------------------------------------------
// Type badge
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, string> = {
  tent: 'bg-emerald-100 text-emerald-800',
  rv: 'bg-blue-100 text-blue-800',
  group: 'bg-purple-100 text-purple-800',
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {formatType(type)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ZoneListProps {
  sites: ScoredSite[];
  bookings: Booking[];
  zones: Zone[];
  mode: 'guest' | 'admin';
  selectedDates?: { arrival: Date; departure: Date };
  onSiteClick: (site: Site) => void;
}

export default function ZoneList({
  sites,
  bookings,
  zones,
  mode,
  selectedDates,
  onSiteClick,
}: ZoneListProps) {
  const sortedZones = [...zones].sort(
    (a, b) => a.display_order - b.display_order,
  );

  return (
    <div className="space-y-8">
      {sortedZones.map((zone) => {
        const zoneSites = sites.filter((s) => s.zone_id === zone.id);
        if (zoneSites.length === 0) return null;

        return (
          <section key={zone.id}>
            <h2 className="text-lg font-semibold mb-1">{zone.name}</h2>
            {zone.description && (
              <p className="text-sm text-gray-500 mb-3">{zone.description}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {zoneSites.map((site) => {
                const available = isAvailable(site, bookings, selectedDates);
                const disabled = mode === 'guest' && !available;
                const hookups = formatHookups(site.hookups);

                return (
                  <button
                    key={site.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && onSiteClick(site)}
                    className={`text-left rounded-lg border p-4 transition ${
                      disabled
                        ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200'
                        : 'hover:border-emerald-400 hover:shadow-sm bg-white border-gray-200 cursor-pointer'
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{site.name}</span>
                      <TypeBadge type={site.type} />
                    </div>

                    {/* Details */}
                    <div className="text-sm text-gray-600 space-y-0.5">
                      {hookups && <div>{hookups}</div>}
                      {site.max_people && (
                        <div>Up to {site.max_people} people</div>
                      )}
                    </div>

                    {/* Price + badge */}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-base font-bold text-emerald-800">
                        ${site.dynamic_rate}
                        <span className="text-xs font-normal text-gray-500">
                          /night
                        </span>
                      </span>
                      {site.badge === 'best_value' && (
                        <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          Best value
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
