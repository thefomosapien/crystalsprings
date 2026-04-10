import Link from "next/link";

export default function HomePage() {
  const campgroundName =
    process.env.NEXT_PUBLIC_CAMPGROUND_NAME ?? "Crystal Springs Campground";
  const phone = process.env.NEXT_PUBLIC_CAMPGROUND_PHONE ?? "";

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center gap-6 px-6 py-32 bg-gradient-to-b from-emerald-800 to-emerald-950 text-white text-center">
        <h1 className="text-5xl font-bold tracking-tight">{campgroundName}</h1>
        <p className="max-w-xl text-lg text-emerald-100">
          Nestled among towering pines and crystal-clear springs. Tent sites, RV
          hookups, cozy cabins, and glamping — all waiting for you.
        </p>
        <div className="flex gap-4 mt-4">
          <Link
            href="/browse"
            className="rounded-lg bg-white text-emerald-900 px-6 py-3 font-semibold hover:bg-emerald-50 transition"
          >
            Browse Sites
          </Link>
          <a
            href={`tel:${phone.replace(/\D/g, "")}`}
            className="rounded-lg border border-white/40 px-6 py-3 font-semibold hover:bg-white/10 transition"
          >
            Call {phone}
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto px-6 py-20">
        {[
          {
            title: "Tent & RV Sites",
            description:
              "Full hookups, pull-throughs, and secluded tent pads across multiple zones.",
          },
          {
            title: "Cabins & Glamping",
            description:
              "From rustic cabins to furnished glamping tents — comfort meets nature.",
          },
          {
            title: "Dynamic Pricing",
            description:
              "Fair, transparent rates that adjust for season, demand, and last-minute deals.",
          },
        ].map((f) => (
          <div key={f.title} className="text-center">
            <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
            <p className="text-gray-600">{f.description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
