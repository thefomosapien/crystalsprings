import { Booking, Season, Site } from '@/lib/types';

const MS = 86_400_000;

function diffDays(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / MS);
}

function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

// ---------------------------------------------------------------------------
// Week computation
// ---------------------------------------------------------------------------

function getWeeks(season: Season): { start: Date; end: Date; label: string }[] {
  const seasonStart = new Date(season.start_date + 'T00:00:00');
  const seasonEnd = new Date(season.end_date + 'T00:00:00');
  const weeks: { start: Date; end: Date; label: string }[] = [];
  const cur = new Date(seasonStart);

  while (cur < seasonEnd) {
    const end = new Date(cur);
    end.setDate(end.getDate() + 7);
    if (end > seasonEnd) end.setTime(seasonEnd.getTime());
    weeks.push({
      start: new Date(cur),
      end: new Date(end),
      label: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
}

function weekOccupancy(
  week: { start: Date; end: Date },
  bookings: Booking[],
  siteCount: number,
): number {
  const weekDays = diffDays(week.end, week.start);
  let bookedNights = 0;

  for (const b of bookings) {
    if (b.status !== 'approved') continue;
    const bArr = new Date(b.arrival + 'T00:00:00');
    const bDep = new Date(b.departure + 'T00:00:00');
    const start = Math.max(bArr.getTime(), week.start.getTime());
    const end = Math.min(bDep.getTime(), week.end.getTime());
    if (end > start) bookedNights += (end - start) / MS;
  }

  const possible = siteCount * weekDays;
  return possible > 0 ? (bookedNights / possible) * 100 : 0;
}

function barColor(pct: number) {
  if (pct > 70) return '#639922';
  if (pct >= 40) return '#EF9F27';
  return '#F09595';
}

// ---------------------------------------------------------------------------
// Metric calculations
// ---------------------------------------------------------------------------

function calcOccupancy(bookings: Booking[], season: Season, siteCount: number) {
  const seasonStart = new Date(season.start_date + 'T00:00:00');
  const seasonEnd = new Date(season.end_date + 'T00:00:00');
  const seasonDays = diffDays(seasonEnd, seasonStart);
  let bookedNights = 0;
  for (const b of bookings) {
    if (b.status !== 'approved') continue;
    bookedNights += Math.max(
      0,
      diffDays(new Date(b.departure + 'T00:00:00'), new Date(b.arrival + 'T00:00:00')),
    );
  }
  const possible = siteCount * seasonDays;
  return possible > 0 ? Math.round((bookedNights / possible) * 100) : 0;
}

function calcRevenue(bookings: Booking[]) {
  return bookings
    .filter((b) => b.status === 'approved')
    .reduce((sum, b) => sum + (b.total ?? 0), 0);
}

function daysLeft(season: Season) {
  const end = new Date(season.end_date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, diffDays(end, today));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SeasonStatsProps {
  bookings: Booking[];
  season: Season;
  sites: Site[];
}

export default function SeasonStats({ bookings, season, sites }: SeasonStatsProps) {
  const siteCount = sites.filter((s) => s.active).length;
  const occupancy = calcOccupancy(bookings, season, siteCount);
  const revenue = calcRevenue(bookings);
  const pending = bookings.filter((b) => b.status === 'pending').length;
  const remaining = daysLeft(season);

  const metrics = [
    { label: 'Occupancy', value: `${occupancy}%` },
    { label: 'Revenue', value: fmtMoney(revenue) },
    { label: 'Pending approvals', value: String(pending) },
    { label: 'Days left in season', value: String(remaining) },
  ];

  // Bar chart
  const weeks = getWeeks(season);
  const BAR_W = 52;
  const GAP = 10;
  const CHART_H = 130;
  const TOP_PAD = 24;
  const BOTTOM_PAD = 36;
  const LEFT_PAD = 8;
  const STRIDE = BAR_W + GAP;
  const SVG_W = LEFT_PAD + weeks.length * STRIDE;
  const SVG_H = TOP_PAD + CHART_H + BOTTOM_PAD;

  return (
    <div className="mb-10">
      {/* Season label */}
      <h2 className="text-sm font-semibold text-gray-500 mb-4">{season.label}</h2>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-1">{m.label}</p>
            <p className="text-2xl font-bold text-gray-900">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 overflow-x-auto">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
          Weekly occupancy
        </p>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width={SVG_W}
          height={SVG_H}
          className="block"
        >
          {/* Grid lines */}
          {[0, 50, 100].map((pct) => {
            const y = TOP_PAD + CHART_H - (pct / 100) * CHART_H;
            return (
              <g key={pct}>
                <line
                  x1={LEFT_PAD}
                  y1={y}
                  x2={SVG_W}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth={1}
                />
                <text x={0} y={y + 4} fontSize={9} fill="#9CA3AF">
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {weeks.map((week, i) => {
            const pct = weekOccupancy(week, bookings, siteCount);
            const barH = Math.max(2, (pct / 100) * CHART_H);
            const x = LEFT_PAD + i * STRIDE;
            const y = TOP_PAD + CHART_H - barH;
            const color = barColor(pct);

            return (
              <g key={i}>
                <rect x={x} y={y} width={BAR_W} height={barH} fill={color} rx={3} />
                <text
                  x={x + BAR_W / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill={color}
                  fontWeight={600}
                >
                  {Math.round(pct)}%
                </text>
                <text
                  x={x + BAR_W / 2}
                  y={TOP_PAD + CHART_H + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#6B7280"
                >
                  {week.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
