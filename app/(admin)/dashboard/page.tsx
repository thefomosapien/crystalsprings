export default function DashboardPage() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: "Active Bookings", value: "—" },
          { label: "Check-ins Today", value: "—" },
          { label: "Revenue (MTD)", value: "—" },
          { label: "Occupancy Rate", value: "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border rounded-lg p-6 text-center"
          >
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <p className="text-gray-500">
        Dashboard charts and live data coming soon.
      </p>
    </main>
  );
}
