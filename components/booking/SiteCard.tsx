'use client';

import { ScoredSite } from '@/lib/optimizer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatType(t: string) {
  return t === 'rv' ? 'RV' : t.charAt(0).toUpperCase() + t.slice(1);
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

const TYPE_COLORS: Record<string, string> = {
  tent: 'bg-emerald-100 text-emerald-800',
  rv: 'bg-blue-100 text-blue-800',
  group: 'bg-purple-100 text-purple-800',
};

const TYPE_ICON: Record<string, string> = {
  tent: 'M12 2 L2 18 H22 Z',
  rv: 'M3 14h18v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4Zm0 0v2h18v-2M7 14v-2m10 2v-2',
  group: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 14v-2a4 4 0 0 0-3-3.87M13 1.13a4 4 0 0 1 0 7.75',
};

// ---------------------------------------------------------------------------
// Feature tags
// ---------------------------------------------------------------------------

interface Feature {
  key: string;
  label: string;
  test: (s: ScoredSite) => boolean;
}

const FEATURES: Feature[] = [
  { key: 'fire_ring', label: 'Fire ring', test: (s) => s.fire_ring },
  { key: 'picnic_table', label: 'Picnic table', test: (s) => s.picnic_table },
  { key: 'river_access', label: 'River access', test: (s) => s.river_access },
  { key: 'pet_friendly', label: 'Pet friendly', test: (s) => s.pet_friendly },
  { key: 'ada_accessible', label: 'ADA', test: (s) => s.ada_accessible },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SiteCardProps {
  site: ScoredSite;
  zoneName?: string;
  onClick: () => void;
}

export default function SiteCard({ site, zoneName, onClick }: SiteCardProps) {
  const hookups = formatHookups(site.hookups);
  const activeFeatures = FEATURES.filter((f) => f.test(site));

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition">
      {/* Photo placeholder */}
      <div className="bg-gray-100 h-40 flex items-center justify-center">
        <svg
          className="w-12 h-12 text-gray-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={TYPE_ICON[site.type] ?? TYPE_ICON.tent} />
        </svg>
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="font-semibold text-lg leading-tight">{site.name}</h3>
            {zoneName && (
              <p className="text-sm text-gray-500">{zoneName}</p>
            )}
          </div>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
              TYPE_COLORS[site.type] ?? 'bg-gray-100 text-gray-700'
            }`}
          >
            {formatType(site.type)}
          </span>
        </div>

        {/* Details */}
        <div className="text-sm text-gray-600 mt-2 space-y-0.5">
          {hookups && <div>{hookups}</div>}
          {site.max_people && <div>Up to {site.max_people} guests</div>}
        </div>

        {/* Feature tags */}
        {activeFeatures.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {activeFeatures.map((f) => (
              <span
                key={f.key}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
              >
                {f.label}
              </span>
            ))}
          </div>
        )}

        {/* Price + badge */}
        <div className="flex items-center justify-between mt-4">
          <div>
            <span className="text-xl font-bold text-emerald-800">
              ${site.dynamic_rate}
            </span>
            <span className="text-sm text-gray-500"> / night</span>
          </div>
          {site.badge === 'best_value' && (
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
              Best value
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onClick}
          className="mt-4 w-full bg-emerald-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-emerald-800 transition"
        >
          View &amp; reserve
        </button>
      </div>
    </div>
  );
}
