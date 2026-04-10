import { PRICING_RULES, PricingRule } from './pricing.config';
import { Season } from './types';

interface PricingContext {
  check_in: Date;
  check_out: Date;
  base_price: number;
  seasons: Season[];
  gap_nights_before: number | null;
  gap_nights_after: number | null;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 5 || day === 6; // Friday, Saturday
}

function isInPeakSeason(date: Date, seasons: Season[]): boolean {
  return seasons.some(
    (s) =>
      date >= new Date(s.start_date) &&
      date <= new Date(s.end_date),
  );
}

function daysUntil(target: Date): number {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getActiveRules(ctx: PricingContext): PricingRule[] {
  const active: PricingRule[] = [];

  const checkInDate = new Date(ctx.check_in);

  for (const rule of PRICING_RULES) {
    switch (rule.trigger) {
      case 'weekend':
        if (isWeekend(checkInDate)) active.push(rule);
        break;
      case 'peak_season':
        if (isInPeakSeason(checkInDate, ctx.seasons)) active.push(rule);
        break;
      case 'gap_lte_3_nights':
        if (
          (ctx.gap_nights_before !== null && ctx.gap_nights_before <= 3) ||
          (ctx.gap_nights_after !== null && ctx.gap_nights_after <= 3)
        )
          active.push(rule);
        break;
      case 'gap_lte_6_nights':
        if (
          (ctx.gap_nights_before !== null && ctx.gap_nights_before <= 6) ||
          (ctx.gap_nights_after !== null && ctx.gap_nights_after <= 6)
        )
          active.push(rule);
        break;
      case 'last_minute_lte_5_days':
        if (daysUntil(checkInDate) <= 5) active.push(rule);
        break;
    }
  }

  return active.sort((a, b) => a.priority - b.priority);
}

export function calculateNightlyRate(ctx: PricingContext): {
  rate: number;
  applied_rules: PricingRule[];
} {
  const rules = getActiveRules(ctx);
  let rate = ctx.base_price;

  for (const rule of rules) {
    rate += ctx.base_price * (rule.modifier_pct / 100);
  }

  return {
    rate: Math.round(rate * 100) / 100,
    applied_rules: rules,
  };
}

export function calculateTotalPrice(
  ctx: PricingContext,
): { total: number; nightly_rate: number; num_nights: number; applied_rules: PricingRule[] } {
  const { rate, applied_rules } = calculateNightlyRate(ctx);
  const msPerNight = 1000 * 60 * 60 * 24;
  const num_nights = Math.ceil(
    (ctx.check_out.getTime() - ctx.check_in.getTime()) / msPerNight,
  );

  return {
    total: Math.round(rate * num_nights * 100) / 100,
    nightly_rate: rate,
    num_nights,
    applied_rules,
  };
}
