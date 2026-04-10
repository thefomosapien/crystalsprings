import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase';
import BookingForm from '@/components/booking/BookingForm';

export default async function BookPage({
  params,
  searchParams,
}: {
  params: { siteId: string };
  searchParams: { arrival?: string; departure?: string };
}) {
  const supabase = createServiceRoleClient();

  const { data: site } = await supabase
    .from('sites')
    .select('*')
    .eq('id', params.siteId)
    .eq('active', true)
    .single();

  if (!site) notFound();

  const [zoneRes, bookingsRes] = await Promise.all([
    supabase.from('zones').select('name').eq('id', site.zone_id).single(),
    supabase
      .from('bookings')
      .select('*')
      .eq('site_id', params.siteId)
      .in('status', ['approved', 'pending']),
  ]);

  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <BookingForm
        site={site}
        zoneName={zoneRes.data?.name ?? 'Unknown zone'}
        bookings={bookingsRes.data ?? []}
        initialArrival={searchParams.arrival ?? null}
        initialDeparture={searchParams.departure ?? null}
      />
    </main>
  );
}
