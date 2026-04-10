'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SiteCard from './SiteCard';
import { calculateStayRate } from '@/lib/pricing';
import { PRICING_RULES } from '@/lib/pricing.config';
import { ScoredSite } from '@/lib/optimizer';
import { Site, Booking } from '@/lib/types';

const MS_PER_DAY = 86_400_000;

function toDate(s: string): Date {
  return new Date(s + 'T00:00:00');
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BookingFormProps {
  site: Site;
  zoneName: string;
  bookings: Booking[];
  initialArrival: string | null;
  initialDeparture: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookingForm({
  site,
  zoneName,
  bookings,
  initialArrival,
  initialDeparture,
}: BookingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 — dates
  const [arrival, setArrival] = useState(initialArrival ?? '');
  const [departure, setDeparture] = useState(initialDeparture ?? '');

  // Step 2 — guest details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [rvLength, setRvLength] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [returningGuest, setReturningGuest] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);

  // Step 3 — submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Pricing
  // -----------------------------------------------------------------------

  const datesValid = arrival && departure && toDate(departure) > toDate(arrival);
  const nights = datesValid
    ? Math.round(
        (toDate(departure).getTime() - toDate(arrival).getTime()) / MS_PER_DAY,
      )
    : 0;

  const ratePerNight =
    datesValid && nights > 0
      ? calculateStayRate(
          site,
          toDate(arrival),
          toDate(departure),
          bookings,
          PRICING_RULES,
        )
      : site.base_rate;

  const total = ratePerNight * nights;

  // Build a ScoredSite for the SiteCard
  const scoredSite: ScoredSite = {
    ...site,
    urgency_score: 0,
    dynamic_rate: ratePerNight,
    badge: null,
  };

  // -----------------------------------------------------------------------
  // Returning guest lookup
  // -----------------------------------------------------------------------

  async function handleEmailBlur() {
    if (!returningGuest || !email || lookupDone) return;
    try {
      const res = await fetch(
        `/api/guests/lookup?email=${encodeURIComponent(email)}`,
      );
      if (res.ok) {
        const guest = await res.json();
        if (guest.name && !name) setName(guest.name);
        if (guest.phone && !phone) setPhone(guest.phone);
        setLookupDone(true);
      }
    } catch {
      /* ignore lookup failures */
    }
  }

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  function validateStep1(): string | null {
    if (!arrival) return 'Arrival date is required';
    if (!departure) return 'Departure date is required';
    if (!datesValid) return 'Departure must be after arrival';
    return null;
  }

  function validateStep2(): string | null {
    if (!name.trim()) return 'Name is required';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return 'A valid email is required';
    if (!partySize || partySize < 1) return 'Party size is required';
    if (site.max_people && partySize > site.max_people)
      return `This site allows a maximum of ${site.max_people} guests`;
    return null;
  }

  // -----------------------------------------------------------------------
  // Step navigation
  // -----------------------------------------------------------------------

  function goToStep2() {
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(2);
  }

  function goToStep3() {
    const err = validateStep2();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(3);
  }

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: site.id,
          arrival,
          departure,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          party_size: partySize,
          rv_length_ft: site.type === 'rv' && rvLength ? Number(rvLength) : null,
          special_requests: specialRequests.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        setSubmitting(false);
        return;
      }

      router.push(`/confirmation?booking_id=${data.booking_id}`);
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  // -----------------------------------------------------------------------
  // Steps indicator
  // -----------------------------------------------------------------------

  const steps = ['Confirm site', 'Your details', 'Review & submit'];

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-6 ${done ? 'bg-emerald-600' : 'bg-gray-200'}`}
                />
              )}
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                  active
                    ? 'bg-emerald-700 text-white'
                    : done
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {n}
              </div>
              <span
                className={`text-sm hidden sm:inline ${
                  active ? 'font-semibold text-gray-900' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {/* ----- Step 1: Confirm site ----- */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="max-w-sm">
            <SiteCard site={scoredSite} zoneName={zoneName} onClick={() => {}} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1">Arrival</label>
              <input
                type="date"
                value={arrival}
                onChange={(e) => setArrival(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Departure
              </label>
              <input
                type="date"
                value={departure}
                min={arrival}
                onChange={(e) => setDeparture(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {datesValid && (
            <div className="bg-gray-50 rounded-lg p-4 max-w-md">
              <div className="flex justify-between text-sm mb-1">
                <span>
                  ${ratePerNight} &times; {nights} night
                  {nights !== 1 ? 's' : ''}
                </span>
                <span className="font-semibold">${total}</span>
              </div>
              <p className="text-xs text-gray-500">
                Final total calculated at booking time
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={goToStep2}
            className="bg-emerald-700 text-white rounded-lg px-6 py-2.5 font-semibold hover:bg-emerald-800 transition"
          >
            Continue
          </button>
        </div>
      )}

      {/* ----- Step 2: Your details ----- */}
      {step === 2 && (
        <div className="space-y-5 max-w-md">
          {/* Returning guest */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={returningGuest}
              onChange={(e) => {
                setReturningGuest(e.target.checked);
                setLookupDone(false);
              }}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Returning guest?</span>
          </label>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setLookupDone(false);
              }}
              onBlur={handleEmailBlur}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Full name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Party size *
            </label>
            <input
              type="number"
              min={1}
              max={site.max_people ?? undefined}
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            {site.max_people && (
              <p className="text-xs text-gray-500 mt-1">
                Max {site.max_people} for this site
              </p>
            )}
          </div>

          {site.type === 'rv' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                RV length (ft)
              </label>
              <input
                type="number"
                value={rvLength}
                onChange={(e) => setRvLength(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. 35"
              />
              {site.max_rv_length_ft && (
                <p className="text-xs text-gray-500 mt-1">
                  Max {site.max_rv_length_ft} ft for this site
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Special requests
            </label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Early check-in, extra firewood, etc."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep(1);
              }}
              className="border border-gray-200 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={goToStep3}
              className="bg-emerald-700 text-white rounded-lg px-6 py-2.5 font-semibold hover:bg-emerald-800 transition"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ----- Step 3: Review & submit ----- */}
      {step === 3 && (
        <div className="space-y-6 max-w-md">
          <div className="bg-gray-50 rounded-lg p-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Site</span>
              <span className="font-medium">
                {site.name} — {zoneName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Dates</span>
              <span className="font-medium">
                {arrival} to {departure} ({nights} night
                {nights !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Guest</span>
              <span className="font-medium">{name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{email}</span>
            </div>
            {phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium">{phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Party size</span>
              <span className="font-medium">{partySize}</span>
            </div>
            {site.type === 'rv' && rvLength && (
              <div className="flex justify-between">
                <span className="text-gray-500">RV length</span>
                <span className="font-medium">{rvLength} ft</span>
              </div>
            )}
            {specialRequests && (
              <div>
                <span className="text-gray-500 block mb-1">
                  Special requests
                </span>
                <span className="font-medium">{specialRequests}</span>
              </div>
            )}
            <hr className="border-gray-200" />
            <div className="flex justify-between">
              <span className="text-gray-500">Rate</span>
              <span className="font-medium">${ratePerNight} / night</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-emerald-800">${total}</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
            Your booking is pending approval. You&apos;ll hear from us within 24
            hours.
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep(2);
              }}
              className="border border-gray-200 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald-700 text-white rounded-lg px-6 py-2.5 font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Submit booking request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
