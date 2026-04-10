export default function BookingsPage() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Bookings</h1>
        <button className="bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-emerald-800 transition">
          + New Booking
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium">Guest</th>
              <th className="px-4 py-3 font-medium">Site</th>
              <th className="px-4 py-3 font-medium">Check-in</th>
              <th className="px-4 py-3 font-medium">Check-out</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-8 text-center text-gray-400" colSpan={5}>
                No bookings yet. Data will load from Supabase.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
