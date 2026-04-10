import { PricingRule } from './pricing.config';
import { Booking, Site } from './types';

const MS_PER_DAY = 86_400_000;

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

/**
 * Find the length (in nights) of the available gap containing `date`.
 * Only approved/pending bookings count as occupied.
 * Returns null when the gap is unbounded (no neighbor on one or both sides)
 * or the date falls inside a booking.
 */
export function findGapNights(date: Date, siteBookings: Booking[]): number | null {
  const occupied = siteBookings
    .filter((b) => b.status === 'approved' || b.status === 'pending')
    .sort((a, b) => new Date(a.arrival).getTime() - new Date(b.arrival).getTime());

  if (occupied.length === 0) return null;

  const firstArrival = new Date(occupied[0].arrival);
  if (date < firstArrival) return null; // before all bookings — unbounded

  for (let i = 0; i < occupied.length; i++) {
    const bArrival = new Date(occupied[i].arrival);
    const bDeparture = new Date(occupied[i].departure);

    // date falls inside a booking
    if (date >= bArrival && date < bDeparture) return null;

    if (date >= bDeparture) {
      const nextArrival =
        i + 1 < occupied.length ? new Date(occupied[i + 1].arrival) : null;

      if (nextArrival === null || date < nextArrival) {
        if (nextArrival === null) return null; // after last booking — unbounded
        return diffDays(nextArrival, bDeparture);
      }
    }
  }

  return null;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Saturday or Sunday
}

function isPeakSeason(date: Date): boolean {
  const month = date.getMonth(); // 0-indexed
  return month === 6 || month === 7; // July or August
}

function isLastMinute(date: Date): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return diffDays(target, now) <= 5;
}

function triggerApplies(
  trigger: string,
  date: Date,
  gapNights: number | null,
): boolean {
  switch (trigger) {
    case 'weekend':
      return isWeekend(date);
    case 'peak_season':
      return isPeakSeason(date);
    case 'gap_lte_3_nights':
      return gapNights !== null && gapNights >= 1 && gapNights <= 3;
    case 'gap_lte_6_nights':
      return gapNights !== null && gapNights >= 4 && gapNights <= 6;
    case 'last_minute_lte_5_days':
      return isLastMinute(date);
    default:
      return false;
  }
}

export function calculateNightRate(
  site: Site,
  date: Date,
  siteBookings: Booking[],
  rules: PricingRule[],
): number {
  let rate = site.base_rate;

  const gapNights = findGapNights(date, siteBookings);

  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    if (triggerApplies(rule.trigger, date, gapNights)) {
      rate = rate * (1 + rule.modifier_pct / 100);
    }
  }

  const clamped = Math.max(site.floor_rate, Math.min(site.ceiling_rate, rate));
  return Math.round(clamped);
}

export function calculateStayRate(
  site: Site,
  arrival: Date,
  departure: Date,
  siteBookings: Booking[],
  rules: PricingRule[],
): number {
  const nights = diffDays(departure, arrival);
  if (nights <= 0) return 0;

  let total = 0;
  for (let i = 0; i < nights; i++) {
    const nightDate = new Date(arrival.getTime() + i * MS_PER_DAY);
    total += calculateNightRate(site, nightDate, siteBookings, rules);
  }

  return Math.round(total / nights);
}
