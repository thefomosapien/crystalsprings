'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/bookings', label: 'Bookings' },
  { href: '/map', label: 'Map' },
  { href: '/settings', label: 'Settings' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="w-52 shrink-0 bg-gray-900 text-gray-100 flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-gray-700">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
          Crystal Springs
        </p>
        <p className="text-sm font-medium text-white">Admin</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-emerald-700 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
