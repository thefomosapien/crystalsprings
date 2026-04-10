import { PricingRule } from './pricing.config';
import { Booking, Site } from './types';
import { calculateStayRate } from './pricing';

const MS_PER_DAY = 86_400_000;
const MAX_SEASON_NIGHTS = 56;

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

export type ScoredSite = Site & {
  urgency_score: number;
  dynamic_rate: number;
  badge: 'best_value' | null;
};

function overlaps(booking: Booking, arrival: Date, departure: Date): boolean {
  const bArr = new Date(booking.arrival);
  const bDep = new Date(booking.departure);
  return bArr < departure && bDep > arrival;
}

export function scoreSites(
  sites: Site[],
  arrival: Date,
  departure: Date,
  allBookings: Booking[],
  rules: PricingRule[],
): ScoredSite[] {
  const stayLength = diffDays(departure, arrival);

  // 1. Active sites only
  const activeSites = sites.filter((s) => s.active);

  // 2. Filter to available sites
  const available = activeSites.filter((site) => {
    const siteBookings = allBookings.filter(
      (b) =>
        b.site_id === site.id &&
        (b.status === 'approved' || b.status === 'pending'),
    );
    return !siteBookings.some((b) => overlaps(b, arrival, departure));
  });

  // 3. Score each site
  const scored: ScoredSite[] = available.map((site) => {
    const siteBookings = allBookings.filter((b) => b.site_id === site.id);
    const occupied = siteBookings
      .filter((b) => b.status === 'approved' || b.status === 'pending')
      .sort(
        (a, b) =>
          new Date(a.arrival).getTime() - new Date(b.arrival).getTime(),
      );

    // Find gap containing the requested dates
    let nightsBefore = MAX_SEASON_NIGHTS;
    let nightsAfter = MAX_SEASON_NIGHTS;

    if (occupied.length > 0) {
      // Find the booking just before the arrival
      let prevDeparture: Date | null = null;
      let nextArrival: Date | null = null;

      for (const b of occupied) {
        const bDep = new Date(b.departure);
        if (bDep <= arrival) {
          prevDeparture = bDep;
        }
      }

      for (const b of occupied) {
        const bArr = new Date(b.arrival);
        if (bArr >= departure) {
          nextArrival = bArr;
          break;
        }
      }

      if (prevDeparture) {
        nightsBefore = diffDays(arrival, prevDeparture);
      }
      if (nextArrival) {
        nightsAfter = diffDays(nextArrival, departure);
      }
    }

    const totalGap = nightsBefore + stayLength + nightsAfter;
    const urgency_score = Math.max(0, Math.min(1, 1 - totalGap / MAX_SEASON_NIGHTS));

    const dynamic_rate = calculateStayRate(site, arrival, departure, siteBookings, rules);

    return {
      ...site,
      urgency_score,
      dynamic_rate,
      badge: null as 'best_value' | null,
    };
  });

  // 4. Median dynamic_rate
  if (scored.length > 0) {
    const rates = scored.map((s) => s.dynamic_rate).sort((a, b) => a - b);
    const mid = Math.floor(rates.length / 2);
    const median =
      rates.length % 2 === 0
        ? (rates[mid - 1] + rates[mid]) / 2
        : rates[mid];

    // 5. Assign badge
    for (const s of scored) {
      if (s.urgency_score > 0.6 && s.dynamic_rate <= median) {
        s.badge = 'best_value';
      }
    }
  }

  // 6. Sort: urgency desc, then dynamic_rate asc
  scored.sort((a, b) => {
    if (b.urgency_score !== a.urgency_score) {
      return b.urgency_score - a.urgency_score;
    }
    return a.dynamic_rate - b.dynamic_rate;
  });

  return scored;
}
