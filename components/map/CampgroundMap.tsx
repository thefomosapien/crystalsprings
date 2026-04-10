'use client';

import { useState, useRef, useMemo } from 'react';
import { ScoredSite } from '@/lib/optimizer';
import { Booking, Guest, Site, Zone } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const W = 800;
const H = 600;
const R = 18;
const ZONE_PAD = 40;
const ZONE_PAD_TOP = 56;

const ZONE_BG: Record<string, string> = {
  'River Loop': '#E1F5EE',
  Central: '#E6F1FB',
  'East Loop': '#FAEEDA',
};
const ZONE_BG_DEFAULT = '#F3F4F6';

const COLOR = {
  green: { fill: '#639922', stroke: '#3B6D11' },
  amber: { fill: '#EF9F27', stroke: '#BA7517' },
  gray: { fill: '#B4B2A9', stroke: '#888780' },
  red: { fill: '#F09595', stroke: '#E24B4A' },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function overlaps(b: Booking, start: Date, end: Date) {
  return new Date(b.arrival) < end && new Date(b.departure) > start;
}

function shortName(name: string) {
  const m = name.match(/(\d+)/);
  return m ? `S${m[1]}` : name.slice(0, 3);
}

function formatHookups(h: string | null) {
  if (!h) return 'Unknown';
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

function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 86_400_000);
}

// ---------------------------------------------------------------------------
// Color logic
// ---------------------------------------------------------------------------

interface SiteStyle {
  fill: string;
  stroke: string;
  opacity: number;
  clickable: boolean;
}

function getSiteStyle(
  site: ScoredSite,
  bookings: Booking[],
  mode: 'guest' | 'admin',
  selectedDates?: { arrival: Date; departure: Date },
): SiteStyle {
  const sb = bookings.filter((b) => b.site_id === site.id);

  if (mode === 'admin') {
    const rangeStart = selectedDates?.arrival ?? today();
    const rangeEnd = selectedDates?.departure ?? addDays(today(), 1);

    const bookedNow = sb.some(
      (b) => b.status === 'approved' && overlaps(b, rangeStart, rangeEnd),
    );
    if (bookedNow) return { ...COLOR.red, opacity: 1, clickable: true };

    const pending = sb.some((b) => b.status === 'pending');
    if (pending) return { ...COLOR.amber, opacity: 1, clickable: true };

    const declined = sb.some((b) => b.status === 'declined');
    if (declined) return { ...COLOR.gray, opacity: 1, clickable: true };

    return { ...COLOR.green, opacity: 1, clickable: true };
  }

  // Guest mode
  if (selectedDates) {
    const unavailable = sb.some(
      (b) =>
        (b.status === 'approved' || b.status === 'pending') &&
        overlaps(b, selectedDates.arrival, selectedDates.departure),
    );
    if (unavailable)
      return { ...COLOR.gray, opacity: 0.4, clickable: false };
  }

  return { ...COLOR.green, opacity: 1, clickable: true };
}

// ---------------------------------------------------------------------------
// Zone rects
// ---------------------------------------------------------------------------

interface ZoneRect {
  zone: Zone;
  x: number;
  y: number;
  w: number;
  h: number;
  bg: string;
}

function buildZoneRects(zones: Zone[], sites: ScoredSite[]): ZoneRect[] {
  return zones
    .map((zone) => {
      const zs = sites.filter(
        (s) => s.zone_id === zone.id && s.svg_x != null && s.svg_y != null,
      );
      if (zs.length === 0) return null;

      const xs = zs.map((s) => s.svg_x! * W);
      const ys = zs.map((s) => s.svg_y! * H);

      const x = Math.min(...xs) - ZONE_PAD;
      const y = Math.min(...ys) - ZONE_PAD_TOP;
      const x2 = Math.max(...xs) + ZONE_PAD;
      const y2 = Math.max(...ys) + ZONE_PAD;

      return {
        zone,
        x,
        y,
        w: x2 - x,
        h: y2 - y,
        bg: ZONE_BG[zone.name] ?? ZONE_BG_DEFAULT,
      };
    })
    .filter((r): r is ZoneRect => r !== null);
}

// ---------------------------------------------------------------------------
// Tooltip content
// ---------------------------------------------------------------------------

function guestTooltip(site: ScoredSite) {
  const lines = [
    site.name,
    `${formatType(site.type)} · ${formatHookups(site.hookups)}`,
    site.max_people ? `Up to ${site.max_people} people` : null,
    `$${site.dynamic_rate}/night`,
    site.badge === 'best_value' ? '★ Best value' : null,
  ];
  return lines.filter(Boolean) as string[];
}

function adminTooltip(
  site: ScoredSite,
  bookings: Booking[],
  zones: Zone[],
  guests: Guest[],
  selectedDates?: { arrival: Date; departure: Date },
) {
  const zone = zones.find((z) => z.id === site.zone_id);
  const lines: string[] = [
    site.name,
    `${zone?.name ?? 'Unknown zone'} · ${formatType(site.type)}`,
    formatHookups(site.hookups),
  ];

  const rangeStart = selectedDates?.arrival ?? today();
  const rangeEnd = selectedDates?.departure ?? addDays(today(), 1);
  const active = bookings.find(
    (b) =>
      b.site_id === site.id &&
      (b.status === 'approved' || b.status === 'pending') &&
      overlaps(b, rangeStart, rangeEnd),
  );

  if (active) {
    const guest = guests.find((g) => g.id === active.guest_id);
    lines.push(`Booked: ${guest?.name ?? 'Guest'}`);
    lines.push(`${active.arrival} → ${active.departure}`);
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface CampgroundMapProps {
  sites: ScoredSite[];
  bookings: Booking[];
  zones: Zone[];
  guests?: Guest[];
  mode: 'guest' | 'admin';
  selectedDates?: { arrival: Date; departure: Date };
  onSiteClick: (site: Site) => void;
}

export default function CampgroundMap({
  sites,
  bookings,
  zones,
  guests = [],
  mode,
  selectedDates,
  onSiteClick,
}: CampgroundMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<ScoredSite | null>(null);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });

  const zoneRects = useMemo(() => buildZoneRects(zones, sites), [zones, sites]);

  const mappable = sites.filter(
    (s) => s.svg_x != null && s.svg_y != null,
  );

  function handleMouseEnter(
    e: React.MouseEvent<SVGElement>,
    site: ScoredSite,
  ) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTipPos({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top + 14 });
    setHovered(site);
  }

  function handleMouseMove(e: React.MouseEvent<SVGElement>) {
    if (!containerRef.current || !hovered) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTipPos({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top + 14 });
  }

  function handleMouseLeave() {
    setHovered(null);
  }

  const tooltipLines = hovered
    ? mode === 'guest'
      ? guestTooltip(hovered)
      : adminTooltip(hovered, bookings, zones, guests, selectedDates)
    : [];

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="block rounded-lg bg-stone-50"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Zone grouping rects */}
        {zoneRects.map((zr) => (
          <g key={zr.zone.id}>
            <rect
              x={zr.x}
              y={zr.y}
              width={zr.w}
              height={zr.h}
              rx={12}
              fill={zr.bg}
              stroke="#C0BFB8"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
            <text
              x={zr.x + 12}
              y={zr.y + 18}
              fontSize={13}
              fontWeight={600}
              fill="#6B7280"
            >
              {zr.zone.name}
            </text>
          </g>
        ))}

        {/* Site circles */}
        {mappable.map((site) => {
          const cx = site.svg_x! * W;
          const cy = site.svg_y! * H;
          const style = getSiteStyle(site, bookings, mode, selectedDates);

          return (
            <g
              key={site.id}
              opacity={style.opacity}
              style={{ cursor: style.clickable ? 'pointer' : 'default' }}
              onMouseEnter={(e) => handleMouseEnter(e, site)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={() => style.clickable && onSiteClick(site)}
            >
              <circle
                cx={cx}
                cy={cy}
                r={R}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={2.5}
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11}
                fontWeight={600}
                fill="#fff"
              >
                {shortName(site.name)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip overlay */}
      {hovered && (
        <div
          className="absolute z-10 pointer-events-none rounded-lg bg-gray-900 text-white text-xs px-3 py-2 shadow-lg max-w-[220px]"
          style={{ left: tipPos.x, top: tipPos.y }}
        >
          {tooltipLines.map((line, i) => (
            <div key={i} className={i === 0 ? 'font-semibold mb-0.5' : ''}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
