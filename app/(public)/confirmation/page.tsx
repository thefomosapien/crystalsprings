import Link from "next/link";

export default function ConfirmationPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <div className="text-5xl mb-4">&#9745;</div>
        <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
        <p className="text-gray-600 mb-8">
          You&apos;ll receive a confirmation email with your reservation details
          shortly. We can&apos;t wait to see you at Crystal Springs!
        </p>
        <Link
          href="/"
          className="inline-block bg-emerald-700 text-white rounded-lg px-6 py-3 font-semibold hover:bg-emerald-800 transition"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
