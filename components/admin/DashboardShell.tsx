'use client';

import { useRouter } from 'next/navigation';
import { Booking, Guest, Season, Site, Zone } from '@/lib/types';
import SeasonStats from './SeasonStats';
import BookingQueue from './BookingQueue';

interface DashboardShellProps {
  season: Season;
  bookings: Booking[];
  guests: Guest[];
  sites: Site[];
  zones: Zone[];
}

export default function DashboardShell({
  season,
  bookings,
  guests,
  sites,
  zones,
}: DashboardShellProps) {
  const router = useRouter();

  async function onAction(
    id: string,
    action: 'approve' | 'decline' | 'reassign',
    extra?: { new_site_id?: string },
  ) {
    await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    });
    router.refresh();
  }

  return (
    <>
      <SeasonStats bookings={bookings} season={season} sites={sites} />
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending approvals</h2>
      <BookingQueue
        bookings={bookings}
        guests={guests}
        sites={sites}
        zones={zones}
        onAction={onAction}
      />
    </>
  );
}
