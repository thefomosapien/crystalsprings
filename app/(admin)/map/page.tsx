import { createServiceRoleClient } from '@/lib/supabase';
import AdminMapClient from '@/components/admin/AdminMapClient';

export const dynamic = 'force-dynamic';

export default async function AdminMapPage() {
  const db = createServiceRoleClient();

  const [sitesRes, zonesRes, bookingsRes, guestsRes] = await Promise.all([
    db.from('sites').select().eq('active', true),
    db.from('zones').select().order('display_order', { ascending: true }),
    db.from('bookings').select(),
    db.from('guests').select(),
  ]);

  return (
    <main className="px-6 py-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Map</h1>
      <AdminMapClient
        sites={sitesRes.data ?? []}
        zones={zonesRes.data ?? []}
        bookings={bookingsRes.data ?? []}
        guests={guestsRes.data ?? []}
      />
    </main>
  );
}
