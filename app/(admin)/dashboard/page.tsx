import { createServiceRoleClient } from '@/lib/supabase';
import DashboardShell from '@/components/admin/DashboardShell';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const db = createServiceRoleClient();

  const today = new Date().toISOString().split('T')[0];

  const { data: seasons } = await db
    .from('seasons')
    .select()
    .order('start_date', { ascending: true });

  // Prefer the season currently active; fall back to the most recent one
  const season =
    (seasons ?? []).find((s) => s.start_date <= today && s.end_date >= today) ??
    seasons?.[seasons.length - 1] ??
    null;

  if (!season) {
    return (
      <main className="px-6 py-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <p className="text-gray-500">No season configured yet.</p>
      </main>
    );
  }

  const [bookingsRes, sitesRes, zonesRes, guestsRes] = await Promise.all([
    db.from('bookings').select().eq('season_id', season.id),
    db.from('sites').select(),
    db.from('zones').select(),
    db.from('guests').select(),
  ]);

  return (
    <main className="px-6 py-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <DashboardShell
        season={season}
        bookings={bookingsRes.data ?? []}
        guests={guestsRes.data ?? []}
        sites={sitesRes.data ?? []}
        zones={zonesRes.data ?? []}
      />
    </main>
  );
}
