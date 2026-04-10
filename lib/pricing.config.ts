export interface PricingRule {
  trigger: string;
  modifier_pct: number;
  priority: number;
}

export const PRICING_RULES: PricingRule[] = [
  { trigger: 'weekend',                modifier_pct: 12,  priority: 1 },
  { trigger: 'peak_season',            modifier_pct: 20,  priority: 2 },
  { trigger: 'gap_lte_3_nights',       modifier_pct: -15, priority: 3 },
  { trigger: 'gap_lte_6_nights',       modifier_pct: -8,  priority: 4 },
  { trigger: 'last_minute_lte_5_days', modifier_pct: -10, priority: 5 },
];
