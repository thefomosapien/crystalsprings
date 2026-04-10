import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase';

const PHONE = process.env.NEXT_PUBLIC_CAMPGROUND_PHONE ?? '';

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: { booking_id?: string };
}) {
  if (!searchParams.booking_id) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No booking found</h1>
          <Link href="/browse" className="text-emerald-700 underline">
            Browse campsites
          </Link>
        </div>
      </main>
    );
  }

  const supabase = createServiceRoleClient();

  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', searchParams.booking_id)
    .single();

  if (!booking) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Booking not found</h1>
          <Link href="/browse" className="text-emerald-700 underline">
            Browse campsites
          </Link>
        </div>
      </main>
    );
  }

  const [siteRes, guestRes] = await Promise.all([
    supabase.from('sites').select('name').eq('id', booking.site_id).single(),
    supabase.from('guests').select('name, email').eq('id', booking.guest_id).single(),
  ]);

  const siteName = siteRes.data?.name ?? 'your site';
  const guestName = guestRes.data?.name ?? 'Guest';
  const nights = Math.round(
    (new Date(booking.departure).getTime() -
      new Date(booking.arrival).getTime()) /
      86_400_000,
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">&#9745;</div>
        <h1 className="text-3xl font-bold mb-2">Request received!</h1>
        <p className="text-gray-600 mb-8">
          Thanks, {guestName}. Your reservation request for{' '}
          <strong>{siteName}</strong> has been submitted.
        </p>

        <div className="bg-gray-50 rounded-lg p-5 text-left text-sm space-y-2 mb-8">
          <div className="flex justify-between">
            <span className="text-gray-500">Site</span>
            <span className="font-medium">{siteName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Dates</span>
            <span className="font-medium">
              {booking.arrival} to {booking.departure} ({nights} night
              {nights !== 1 ? 's' : ''})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Party size</span>
            <span className="font-medium">{booking.party_size ?? '—'}</span>
          </div>
          <hr className="border-gray-200" />
          <div className="flex justify-between text-base">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-emerald-800">
              ${booking.total ?? '—'}
            </span>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm mb-8">
          Your booking is <strong>pending approval</strong>. We&apos;ll get back
          to you within 24 hours.
          {PHONE && (
            <>
              {' '}
              Questions? Call us at{' '}
              <a href={`tel:${PHONE.replace(/\D/g, '')}`} className="underline">
                {PHONE}
              </a>
              .
            </>
          )}
        </div>

        <Link
          href="/"
          className="inline-block bg-emerald-700 text-white rounded-lg px-6 py-3 font-semibold hover:bg-emerald-800 transition"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
