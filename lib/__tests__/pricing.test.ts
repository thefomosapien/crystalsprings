import { calculateNightRate, calculateStayRate, findGapNights } from '../pricing';
import { PRICING_RULES } from '../pricing.config';
import { Booking, Site } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSite(overrides: Partial<Site> = {}): Site {
  return {
    id: 'site-1',
    zone_id: 'zone-1',
    name: 'Test Site',
    type: 'tent',
    max_people: 4,
    max_rv_length_ft: null,
    rv_orientation: null,
    hookups: 'water',
    surface: 'grass',
    shade: 'full',
    privacy: 'high',
    pet_friendly: true,
    ada_accessible: false,
    fire_ring: true,
    picnic_table: true,
    river_access: false,
    walk_in_only: false,
    base_rate: 100,
    floor_rate: 50,
    ceiling_rate: 200,
    svg_x: null,
    svg_y: null,
    photos: [],
    notes: null,
    active: true,
    ...overrides,
  };
}

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'booking-1',
    season_id: 'season-1',
    site_id: 'site-1',
    guest_id: 'guest-1',
    arrival: '2026-08-01',
    departure: '2026-08-04',
    party_size: 2,
    status: 'approved',
    rate_per_night: null,
    total: null,
    rv_length_ft: null,
    special_requests: null,
    internal_notes: null,
    urgency_score: null,
    approved_at: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function d(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

// Use only non-weekend, non-last-minute rules for isolated gap tests
const GAP_RULES = PRICING_RULES.filter((r) =>
  r.trigger.startsWith('gap_'),
);

// ---------------------------------------------------------------------------
// findGapNights
// ---------------------------------------------------------------------------

describe('findGapNights', () => {
  it('returns null when there are no bookings', () => {
    expect(findGapNights(d('2026-08-10'), [])).toBeNull();
  });

  it('returns the gap length between two bookings', () => {
    const bookings = [
      makeBooking({ arrival: '2026-08-01', departure: '2026-08-04' }),
      makeBooking({ id: 'b2', arrival: '2026-08-07', departure: '2026-08-14' }),
    ];
    // Gap is Aug 4–7 = 3 nights
    expect(findGapNights(d('2026-08-05'), bookings)).toBe(3);
  });

  it('returns null for a date inside a booking', () => {
    const bookings = [
      makeBooking({ arrival: '2026-08-01', departure: '2026-08-04' }),
    ];
    expect(findGapNights(d('2026-08-02'), bookings)).toBeNull();
  });

  it('returns null for a date after the last booking (unbounded)', () => {
    const bookings = [
      makeBooking({ arrival: '2026-08-01', departure: '2026-08-04' }),
    ];
    expect(findGapNights(d('2026-08-10'), bookings)).toBeNull();
  });

  it('ignores cancelled bookings', () => {
    const bookings = [
      makeBooking({ arrival: '2026-08-01', departure: '2026-08-04' }),
      makeBooking({
        id: 'b-cancelled',
        arrival: '2026-08-04',
        departure: '2026-08-07',
        status: 'cancelled',
      }),
      makeBooking({ id: 'b2', arrival: '2026-08-07', departure: '2026-08-14' }),
    ];
    // Cancelled booking is ignored, so gap is Aug 4–7 = 3 nights
    expect(findGapNights(d('2026-08-05'), bookings)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// calculateNightRate — no adjacent bookings
// ---------------------------------------------------------------------------

describe('calculateNightRate — no adjacent bookings', () => {
  it('returns base_rate when no rules match (mid-week, non-peak, no gap, far future)', () => {
    const site = makeSite({ base_rate: 100 });
    // 2026-10-06 is a Tuesday in October — no weekend, no peak, no gap, far future
    const rate = calculateNightRate(site, d('2026-10-06'), [], PRICING_RULES);
    expect(rate).toBe(100);
  });

  it('applies weekend modifier on Saturday', () => {
    const site = makeSite({ base_rate: 100 });
    // 2026-08-01 is a Saturday — weekend + peak both fire
    // Only use weekend rule to isolate
    const weekendOnly = PRICING_RULES.filter((r) => r.trigger === 'weekend');
    const rate = calculateNightRate(site, d('2026-10-03'), [], weekendOnly);
    // 2026-10-03 is a Saturday: 100 * 1.12 = 112
    expect(rate).toBe(112);
  });

  it('applies peak_season modifier in August', () => {
    const site = makeSite({ base_rate: 100 });
    // 2026-08-04 is a Tuesday in August
    const peakOnly = PRICING_RULES.filter((r) => r.trigger === 'peak_season');
    const rate = calculateNightRate(site, d('2026-08-04'), [], peakOnly);
    // 100 * 1.20 = 120
    expect(rate).toBe(120);
  });
});

// ---------------------------------------------------------------------------
// calculateNightRate — gap scenarios
// ---------------------------------------------------------------------------

describe('calculateNightRate — 3-night gap', () => {
  const bookings = [
    makeBooking({ arrival: '2026-10-01', departure: '2026-10-04' }),
    makeBooking({ id: 'b2', arrival: '2026-10-07', departure: '2026-10-14' }),
  ];
  // Gap: Oct 4–7 = 3 nights

  it('applies gap_lte_3_nights discount', () => {
    const site = makeSite({ base_rate: 100 });
    const rate = calculateNightRate(site, d('2026-10-05'), bookings, GAP_RULES);
    // 100 * (1 + (-15/100)) = 100 * 0.85 = 85
    expect(rate).toBe(85);
  });

  it('does not apply gap_lte_6_nights for a 3-night gap', () => {
    const site = makeSite({ base_rate: 100 });
    const sixOnly = PRICING_RULES.filter((r) => r.trigger === 'gap_lte_6_nights');
    const rate = calculateNightRate(site, d('2026-10-05'), bookings, sixOnly);
    // 3-night gap does not match 4-6 range, so no discount
    expect(rate).toBe(100);
  });
});

describe('calculateNightRate — 5-night gap', () => {
  const bookings = [
    makeBooking({ arrival: '2026-10-01', departure: '2026-10-04' }),
    makeBooking({ id: 'b2', arrival: '2026-10-09', departure: '2026-10-14' }),
  ];
  // Gap: Oct 4–9 = 5 nights

  it('applies gap_lte_6_nights discount for a 5-night gap', () => {
    const site = makeSite({ base_rate: 100 });
    const rate = calculateNightRate(site, d('2026-10-06'), bookings, GAP_RULES);
    // 100 * (1 + (-8/100)) = 100 * 0.92 = 92
    expect(rate).toBe(92);
  });
});

// ---------------------------------------------------------------------------
// calculateNightRate — stacking
// ---------------------------------------------------------------------------

describe('calculateNightRate — weekend + gap stacking', () => {
  it('applies weekend then gap multiplicatively', () => {
    // Need a Saturday in a 3-night gap in October (not peak)
    // Oct 3, 2026 is a Saturday
    const bookings = [
      makeBooking({ arrival: '2026-10-01', departure: '2026-10-03' }),
      makeBooking({ id: 'b2', arrival: '2026-10-06', departure: '2026-10-10' }),
    ];
    // Gap: Oct 3–6 = 3 nights. Oct 3 is Saturday.
    const site = makeSite({ base_rate: 100 });
    const weekendAndGap = PRICING_RULES.filter(
      (r) => r.trigger === 'weekend' || r.trigger === 'gap_lte_3_nights',
    );
    const rate = calculateNightRate(site, d('2026-10-03'), bookings, weekendAndGap);
    // weekend first (priority 1): 100 * 1.12 = 112
    // gap_lte_3 (priority 3): 112 * 0.85 = 95.2 → round = 95
    expect(rate).toBe(95);
  });
});

// ---------------------------------------------------------------------------
// calculateNightRate — floor and ceiling clamping
// ---------------------------------------------------------------------------

describe('calculateNightRate — clamping', () => {
  it('clamps to ceiling_rate when modifiers push rate above it', () => {
    // All positive modifiers stacking
    const site = makeSite({ base_rate: 190, ceiling_rate: 200 });
    // Saturday in August — weekend (12%) + peak (20%)
    // 2026-08-01 is a Saturday
    const rules = PRICING_RULES.filter(
      (r) => r.trigger === 'weekend' || r.trigger === 'peak_season',
    );
    const rate = calculateNightRate(site, d('2026-08-01'), [], rules);
    // 190 * 1.12 = 212.8, then 212.8 * 1.20 = 255.36 → clamped to 200
    expect(rate).toBe(200);
  });

  it('clamps to floor_rate when discounts push rate below it', () => {
    const bookings = [
      makeBooking({ arrival: '2026-10-01', departure: '2026-10-03' }),
      makeBooking({ id: 'b2', arrival: '2026-10-06', departure: '2026-10-10' }),
    ];
    // 3-night gap (Oct 3–6). Use a Tuesday Oct 5 to avoid weekend.
    // But we need Oct 5 — let me check: Oct 5, 2026 is Monday. Good.
    const site = makeSite({ base_rate: 55, floor_rate: 50 });
    const rate = calculateNightRate(site, d('2026-10-05'), bookings, GAP_RULES);
    // 55 * 0.85 = 46.75 → clamped to floor 50
    expect(rate).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// calculateStayRate
// ---------------------------------------------------------------------------

describe('calculateStayRate', () => {
  it('averages nightly rates across the stay', () => {
    const site = makeSite({ base_rate: 100 });
    // Oct 5 (Mon) – Oct 8 (Thu) 2026, no bookings, October (not peak), far future
    // Each night = 100, average = 100
    const rate = calculateStayRate(
      site,
      d('2026-10-05'),
      d('2026-10-08'),
      [],
      PRICING_RULES,
    );
    expect(rate).toBe(100);
  });

  it('returns 0 for zero-length stay', () => {
    const site = makeSite({ base_rate: 100 });
    const rate = calculateStayRate(
      site,
      d('2026-10-05'),
      d('2026-10-05'),
      [],
      PRICING_RULES,
    );
    expect(rate).toBe(0);
  });
});
