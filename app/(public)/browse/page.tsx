import { createServiceRoleClient } from '@/lib/supabase';
import BrowseClient from '@/components/booking/BrowseClient';
import { Site, Zone, Booking } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function BrowsePage() {
  const supabase = createServiceRoleClient();

  const [sitesRes, zonesRes, bookingsRes] = await Promise.all([
    supabase.from('sites').select('*').eq('active', true),
    supabase.from('zones').select('*').order('display_order'),
    supabase
      .from('bookings')
      .select('*')
      .in('status', ['approved', 'pending']),
  ]);

  const sites: Site[] = sitesRes.data ?? [];
  const zones: Zone[] = zonesRes.data ?? [];
  const bookings: Booking[] = bookingsRes.data ?? [];

  return (
    <main className="min-h-screen">
      <BrowseClient sites={sites} zones={zones} bookings={bookings} />
    </main>
  );
}
