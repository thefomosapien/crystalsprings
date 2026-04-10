import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { calculateStayRate } from '@/lib/pricing';
import { scoreSites } from '@/lib/optimizer';
import { PRICING_RULES } from '@/lib/pricing.config';

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();

  // -----------------------------------------------------------------------
  // 1. Parse and validate
  // -----------------------------------------------------------------------

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { site_id, arrival, departure, name, email, phone, party_size, rv_length_ft, special_requests } = body as {
    site_id?: string;
    arrival?: string;
    departure?: string;
    name?: string;
    email?: string;
    phone?: string | null;
    party_size?: number;
    rv_length_ft?: number | null;
    special_requests?: string | null;
  };

  if (!site_id || !arrival || !departure || !name || !email || !party_size) {
    return NextResponse.json(
      { error: 'Missing required fields: site_id, arrival, departure, name, email, party_size' },
      { status: 400 },
    );
  }

  const arrDate = new Date(arrival + 'T00:00:00');
  const depDate = new Date(departure + 'T00:00:00');
  if (isNaN(arrDate.getTime()) || isNaN(depDate.getTime()) || depDate <= arrDate) {
    return NextResponse.json(
      { error: 'Invalid date range' },
      { status: 400 },
    );
  }

  // -----------------------------------------------------------------------
  // 2. Fetch site — confirm it exists and is active
  // -----------------------------------------------------------------------

  const { data: site, error: siteErr } = await supabase
    .from('sites')
    .select('*')
    .eq('id', site_id)
    .eq('active', true)
    .single();

  if (siteErr || !site) {
    return NextResponse.json(
      { error: 'Site not found or inactive' },
      { status: 404 },
    );
  }

  // -----------------------------------------------------------------------
  // 3. Check availability — no overlapping approved/pending bookings
  // -----------------------------------------------------------------------

  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('site_id', site_id)
    .not('status', 'in', '("declined","cancelled")')
    .lt('arrival', departure)
    .gt('departure', arrival);

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json(
      { error: 'This site is no longer available for your selected dates' },
      { status: 409 },
    );
  }

  // -----------------------------------------------------------------------
  // 4. Guest — find or create
  // -----------------------------------------------------------------------

  const normalizedEmail = email.trim().toLowerCase();

  const { data: existingGuest } = await supabase
    .from('guests')
    .select('*')
    .eq('email', normalizedEmail)
    .single();

  let guestId: string;

  if (existingGuest) {
    guestId = existingGuest.id;
    await supabase
      .from('guests')
      .update({ booking_count: (existingGuest.booking_count ?? 0) + 1 })
      .eq('id', guestId);
  } else {
    const { data: newGuest, error: guestErr } = await supabase
      .from('guests')
      .insert({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone?.trim() || null,
        booking_count: 1,
      })
      .select('id')
      .single();

    if (guestErr || !newGuest) {
      return NextResponse.json(
        { error: 'Failed to create guest record' },
        { status: 500 },
      );
    }
    guestId = newGuest.id;
  }

  // -----------------------------------------------------------------------
  // 5. Calculate rate
  // -----------------------------------------------------------------------

  const { data: allBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('site_id', site_id)
    .in('status', ['approved', 'pending']);

  const siteBookings = allBookings ?? [];

  const rate_per_night = calculateStayRate(
    site,
    arrDate,
    depDate,
    siteBookings,
    PRICING_RULES,
  );

  const nights = Math.round(
    (depDate.getTime() - arrDate.getTime()) / 86_400_000,
  );
  const total = rate_per_night * nights;

  // -----------------------------------------------------------------------
  // 6. Calculate urgency score
  // -----------------------------------------------------------------------

  const scored = scoreSites([site], arrDate, depDate, siteBookings, PRICING_RULES);
  const urgency_score = scored.length > 0 ? scored[0].urgency_score : 0;

  // -----------------------------------------------------------------------
  // 7. Find season (optional)
  // -----------------------------------------------------------------------

  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('bookings_open', true)
    .lte('start_date', arrival)
    .gte('end_date', departure)
    .limit(1)
    .single();

  // -----------------------------------------------------------------------
  // 8. Create booking
  // -----------------------------------------------------------------------

  const { data: booking, error: bookErr } = await supabase
    .from('bookings')
    .insert({
      season_id: season?.id ?? null,
      site_id,
      guest_id: guestId,
      arrival,
      departure,
      party_size,
      status: 'pending',
      rate_per_night,
      total,
      rv_length_ft: rv_length_ft ?? null,
      special_requests: special_requests ?? null,
      urgency_score,
    })
    .select('id')
    .single();

  if (bookErr || !booking) {
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 },
    );
  }

  // -----------------------------------------------------------------------
  // 9. Return result
  // -----------------------------------------------------------------------

  return NextResponse.json({
    booking_id: booking.id,
    status: 'pending',
    total,
  });
}
