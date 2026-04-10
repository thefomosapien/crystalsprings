import { createServiceRoleClient } from '@/lib/supabase';
import BookingsShell from '@/components/admin/BookingsShell';

export const dynamic = 'force-dynamic';

export default async function BookingsPage() {
  const db = createServiceRoleClient();

  const [bookingsRes, sitesRes, zonesRes, guestsRes] = await Promise.all([
    db.from('bookings').select().order('created_at', { ascending: false }),
    db.from('sites').select(),
    db.from('zones').select(),
    db.from('guests').select(),
  ]);

  return (
    <main className="px-6 py-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bookings</h1>
      <BookingsShell
        bookings={bookingsRes.data ?? []}
        guests={guestsRes.data ?? []}
        sites={sitesRes.data ?? []}
        zones={zonesRes.data ?? []}
      />
    </main>
  );
}
