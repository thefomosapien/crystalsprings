export default function SettingsPage() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Campground Info</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Campground Name
              </label>
              <input
                type="text"
                defaultValue="Crystal Springs Campground"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                defaultValue="(208) 244-4076"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Seasons</h2>
          <p className="text-gray-500 text-sm">
            Season management coming soon.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Pricing Rules</h2>
          <p className="text-gray-500 text-sm">
            Pricing rules are configured in code. See{" "}
            <code className="bg-gray-100 px-1 rounded">
              /lib/pricing.config.ts
            </code>
          </p>
        </section>
      </div>
    </main>
  );
}
