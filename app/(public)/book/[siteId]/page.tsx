export default function BookSitePage({
  params,
}: {
  params: { siteId: string };
}) {
  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Book Your Stay</h1>
      <p className="text-gray-500 mb-8">Site ID: {params.siteId}</p>

      <form className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Check-in</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Check-out</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            type="tel"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Number of Guests
          </label>
          <input
            type="number"
            min={1}
            defaultValue={1}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-700 text-white rounded-lg py-3 font-semibold hover:bg-emerald-800 transition"
        >
          Reserve Site
        </button>
      </form>
    </main>
  );
}
