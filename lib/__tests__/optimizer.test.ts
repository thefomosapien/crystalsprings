import { scoreSites, ScoredSite } from '../optimizer';
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
    arrival: '2026-10-01',
    departure: '2026-10-04',
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

// ---------------------------------------------------------------------------
// Empty calendar
// ---------------------------------------------------------------------------

describe('scoreSites — empty calendar', () => {
  it('returns all active sites with urgency near 0 when no bookings exist', () => {
    const sites = [
      makeSite({ id: 's1', name: 'A' }),
      makeSite({ id: 's2', name: 'B' }),
    ];
    // Oct 5–8, 3-night stay, no bookings, no gap pressure
    const result = scoreSites(sites, d('2026-10-05'), d('2026-10-08'), [], PRICING_RULES);
    expect(result).toHaveLength(2);
    // With no bookings, nightsBefore = 56, nightsAfter = 56, stayLength = 3
    // totalGap = 56+3+56 = 115, urgency = 1 - 115/56 = negative → clamped to 0
    for (const s of result) {
      expect(s.urgency_score).toBe(0);
      expect(s.badge).toBeNull();
    }
  });

  it('excludes inactive sites', () => {
    const sites = [
      makeSite({ id: 's1', active: true }),
      makeSite({ id: 's2', active: false }),
    ];
    const result = scoreSites(sites, d('2026-10-05'), d('2026-10-08'), [], PRICING_RULES);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s1');
  });
});

// ---------------------------------------------------------------------------
// Fully booked site excluded
// ---------------------------------------------------------------------------

describe('scoreSites — fully booked site excluded', () => {
  it('excludes a site whose approved booking overlaps the requested dates', () => {
    const sites = [
      makeSite({ id: 's1', name: 'Available' }),
      makeSite({ id: 's2', name: 'Booked' }),
    ];
    const bookings = [
      makeBooking({
        id: 'b1',
        site_id: 's2',
        arrival: '2026-10-04',
        departure: '2026-10-10',
        status: 'approved',
      }),
    ];
    // Request Oct 5–8 overlaps the booking on s2
    const result = scoreSites(sites, d('2026-10-05'), d('2026-10-08'), bookings, PRICING_RULES);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s1');
  });

  it('excludes a site whose pending booking overlaps the requested dates', () => {
    const sites = [makeSite({ id: 's1' })];
    const bookings = [
      makeBooking({
        id: 'b1',
        site_id: 's1',
        arrival: '2026-10-06',
        departure: '2026-10-09',
        status: 'pending',
      }),
    ];
    const result = scoreSites(sites, d('2026-10-05'), d('2026-10-08'), bookings, PRICING_RULES);
    expect(result).toHaveLength(0);
  });

  it('does not exclude when a cancelled booking overlaps', () => {
    const sites = [makeSite({ id: 's1' })];
    const bookings = [
      makeBooking({
        id: 'b1',
        site_id: 's1',
        arrival: '2026-10-05',
        departure: '2026-10-08',
        status: 'cancelled',
      }),
    ];
    const result = scoreSites(sites, d('2026-10-05'), d('2026-10-08'), bookings, PRICING_RULES);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Gap detection and urgency
// ---------------------------------------------------------------------------

describe('scoreSites — gap detection', () => {
  it('computes high urgency for a tight gap', () => {
    const sites = [makeSite({ id: 's1' })];
    const bookings = [
      makeBooking({
        id: 'b1',
        site_id: 's1',
        arrival: '2026-10-01',
        departure: '2026-10-04',
      }),
      makeBooking({
        id: 'b2',
        site_id: 's1',
        arrival: '2026-10-07',
        departure: '2026-10-14',
      }),
    ];
    // Request the exact gap: Oct 4–7 (3-night stay)
    // nightsBefore = Oct 4 – Oct 4 = 0
    // nightsAfter = Oct 7 – Oct 7 = 0
    // totalGap = 0 + 3 + 0 = 3
    // urgency = 1 - 3/56 ≈ 0.946
    const result = scoreSites(sites, d('2026-10-04'), d('2026-10-07'), bookings, PRICING_RULES);
    expect(result).toHaveLength(1);
    expect(result[0].urgency_score).toBeCloseTo(1 - 3 / 56, 5);
  });

  it('computes lower urgency for a loose gap', () => {
    const sites = [makeSite({ id: 's1' })];
    const bookings = [
      makeBooking({
        id: 'b1',
        site_id: 's1',
        arrival: '2026-10-01',
        departure: '2026-10-04',
      }),
      makeBooking({
        id: 'b2',
        site_id: 's1',
        arrival: '2026-10-24',
        departure: '2026-10-30',
      }),
    ];
    // Request Oct 10–13 (3-night stay)
    // nightsBefore = Oct 10 – Oct 4 = 6
    // nightsAfter = Oct 24 – Oct 13 = 11
    // totalGap = 6 + 3 + 11 = 20
    // urgency = 1 - 20/56 ≈ 0.643
    const result = scoreSites(sites, d('2026-10-10'), d('2026-10-13'), bookings, PRICING_RULES);
    expect(result).toHaveLength(1);
    expect(result[0].urgency_score).toBeCloseTo(1 - 20 / 56, 5);
  });
});

// ---------------------------------------------------------------------------
// Badge assignment
// ---------------------------------------------------------------------------

describe('scoreSites — badge assignment', () => {
  it('assigns best_value when urgency > 0.6 and rate at or below median', () => {
    // Create two sites: one with tight gap (high urgency, low rate),
    // one with no bookings (low urgency)
    const sites = [
      makeSite({ id: 's1', name: 'Tight Gap', base_rate: 80, floor_rate: 50, ceiling_rate: 200 }),
      makeSite({ id: 's2', name: 'Open', base_rate: 120, floor_rate: 50, ceiling_rate: 200 }),
    ];
    const bookings = [
      makeBooking({
        id: 'b1',
        site_id: 's1',
        arrival: '2026-10-01',
        departure: '2026-10-04',
      }),
      makeBooking({
        id: 'b2',
        site_id: 's1',
        arrival: '2026-10-07',
        departure: '2026-10-14',
      }),
    ];
    // s1: gap Oct 4–7, request Oct 4–7. urgency ≈ 0.946, rate has gap discount
    // s2: no bookings, urgency = 0, rate = 120
    const result = scoreSites(sites, d('2026-10-04'), d('2026-10-07'), bookings, PRICING_RULES);

    const s1 = result.find((s) => s.id === 's1')!;
    const s2 = result.find((s) => s.id === 's2')!;

    expect(s1.urgency_score).toBeGreaterThan(0.6);
    expect(s1.dynamic_rate).toBeLessThanOrEqual(s2.dynamic_rate);
    expect(s1.badge).toBe('best_value');
    expect(s2.badge).toBeNull();
  });

  it('does not assign badge when urgency <= 0.6', () => {
    const sites = [makeSite({ id: 's1', base_rate: 50 })];
    // No bookings → urgency = 0
    const result = scoreSites(sites, d('2026-10-05'), d('2026-10-08'), [], PRICING_RULES);
    expect(result[0].urgency_score).toBe(0);
    expect(result[0].badge).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Sort order
// ---------------------------------------------------------------------------

describe('scoreSites — sort order', () => {
  it('sorts by urgency descending, then dynamic_rate ascending', () => {
    const sites = [
      makeSite({ id: 's1', name: 'Low urgency', base_rate: 60, floor_rate: 30, ceiling_rate: 200 }),
      makeSite({ id: 's2', name: 'High urgency cheap', base_rate: 80, floor_rate: 30, ceiling_rate: 200 }),
      makeSite({ id: 's3', name: 'High urgency expensive', base_rate: 150, floor_rate: 30, ceiling_rate: 200 }),
    ];
    const bookings = [
      // Tight gap on s2
      makeBooking({ id: 'b1', site_id: 's2', arrival: '2026-10-01', departure: '2026-10-04' }),
      makeBooking({ id: 'b2', site_id: 's2', arrival: '2026-10-07', departure: '2026-10-14' }),
      // Same tight gap on s3
      makeBooking({ id: 'b3', site_id: 's3', arrival: '2026-10-01', departure: '2026-10-04' }),
      makeBooking({ id: 'b4', site_id: 's3', arrival: '2026-10-07', departure: '2026-10-14' }),
    ];
    // Request Oct 4–7 — s2 and s3 have high urgency, s1 has 0 urgency
    const result = scoreSites(sites, d('2026-10-04'), d('2026-10-07'), bookings, PRICING_RULES);

    expect(result).toHaveLength(3);
    // s2 and s3 both have same urgency, s2 cheaper → s2 first
    expect(result[0].id).toBe('s2');
    expect(result[1].id).toBe('s3');
    // s1 has urgency 0, sorted last
    expect(result[2].id).toBe('s1');
  });
});
