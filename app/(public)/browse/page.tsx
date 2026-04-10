export default function BrowsePage() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Browse Campsites</h1>

      <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
        {/* Filters sidebar */}
        <aside className="space-y-6">
          <div>
            <h2 className="font-semibold mb-2">Site Type</h2>
            <p className="text-sm text-gray-500">Filters coming soon</p>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Dates</h2>
            <p className="text-sm text-gray-500">Date picker coming soon</p>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Amenities</h2>
            <p className="text-sm text-gray-500">Amenity filters coming soon</p>
          </div>
        </aside>

        {/* Map + site list area */}
        <section>
          <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center mb-8">
            <p className="text-gray-400">Interactive map coming soon</p>
          </div>
          <div className="text-gray-500">
            <p>Site results will appear here once connected to Supabase.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
