'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FilterBar, { FilterState, DEFAULT_FILTERS } from './FilterBar';
import SiteCard from './SiteCard';
import CampgroundMap from '@/components/map/CampgroundMap';
import { scoreSites, ScoredSite } from '@/lib/optimizer';
import { PRICING_RULES } from '@/lib/pricing.config';
import { Site, Zone, Booking } from '@/lib/types';

// ---------------------------------------------------------------------------
// Hookup filter logic
// ---------------------------------------------------------------------------

const HOOKUP_LEVELS: Record<string, number> = {
  none: 0,
  water: 1,
  electric_30a: 2,
  electric_50a: 2,
  full: 3,
  full_sewer: 3,
};

function matchesHookupFilter(
  siteHookups: string | null,
  filter: 'any' | 'water' | 'electric' | 'full',
): boolean {
  if (filter === 'any') return true;
  const level = HOOKUP_LEVELS[siteHookups ?? 'none'] ?? 0;
  const minLevel: Record<string, number> = { water: 1, electric: 2, full: 3 };
  return level >= minLevel[filter];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BrowseClientProps {
  sites: Site[];
  zones: Zone[];
  bookings: Booking[];
}

export default function BrowseClient({
  sites,
  zones,
  bookings,
}: BrowseClientProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [view, setView] = useState<'map' | 'list'>('list');

  // Default to map on desktop
  useEffect(() => {
    if (window.innerWidth >= 768) setView('map');
  }, []);

  // Score sites when dates are set, otherwise show all with base rates
  const scored: ScoredSite[] = useMemo(() => {
    if (filters.arrival && filters.departure) {
      return scoreSites(
        sites,
        filters.arrival,
        filters.departure,
        bookings,
        PRICING_RULES,
      );
    }
    return sites
      .filter((s) => s.active)
      .map((s) => ({
        ...s,
        urgency_score: 0,
        dynamic_rate: s.base_rate,
        badge: null as 'best_value' | null,
      }));
  }, [sites, bookings, filters.arrival, filters.departure]);

  // Apply attribute filters on top
  const filtered = useMemo(() => {
    let result = scored;

    if (filters.type !== 'any') {
      result = result.filter((s) => s.type === filters.type);
    }
    if (filters.hookups !== 'any') {
      result = result.filter((s) =>
        matchesHookupFilter(s.hookups, filters.hookups),
      );
    }
    if (filters.river_access) {
      result = result.filter((s) => s.river_access);
    }
    if (filters.pet_friendly) {
      result = result.filter((s) => s.pet_friendly);
    }
    if (filters.guests) {
      result = result.filter(
        (s) => s.max_people !== null && s.max_people >= filters.guests!,
      );
    }
    return result;
  }, [scored, filters]);

  const zoneMap = useMemo(
    () => new Map(zones.map((z) => [z.id, z.name])),
    [zones],
  );

  function handleSiteClick(site: Site) {
    const params = new URLSearchParams();
    if (filters.arrival)
      params.set('arrival', filters.arrival.toISOString().split('T')[0]);
    if (filters.departure)
      params.set('departure', filters.departure.toISOString().split('T')[0]);
    const qs = params.toString();
    router.push(`/book/${site.id}${qs ? '?' + qs : ''}`);
  }

  const selectedDates =
    filters.arrival && filters.departure
      ? { arrival: filters.arrival, departure: filters.departure }
      : undefined;

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Browse Campsites</h1>

      {/* Filter bar */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Toolbar: count + view toggle */}
      <div className="flex items-center justify-between mt-6 mb-4">
        <p className="text-sm text-gray-600">
          <span className="font-semibold">{filtered.length}</span> site
          {filtered.length !== 1 ? 's' : ''} available
        </p>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setView('map')}
            className={`px-3 py-1.5 text-sm font-medium transition ${
              view === 'map'
                ? 'bg-emerald-700 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Map view
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-sm font-medium transition ${
              view === 'list'
                ? 'bg-emerald-700 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            List view
          </button>
        </div>
      </div>

      {/* Map view */}
      {view === 'map' && (
        <CampgroundMap
          sites={filtered}
          bookings={bookings}
          zones={zones}
          mode="guest"
          selectedDates={selectedDates}
          onSiteClick={handleSiteClick}
        />
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              zoneName={zoneMap.get(site.zone_id)}
              onClick={() => handleSiteClick(site)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-gray-400 py-12">
              No sites match your filters. Try adjusting your search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
