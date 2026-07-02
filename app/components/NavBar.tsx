"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays } from 'lucide-react';

export default function NavBar() {
  const pathname = usePathname();

  const linkClass = (href: string) => {
    const active = pathname === href;
    return `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
      active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
    }`;
  };

  return (
    <nav className="flex items-center gap-2 mb-8">
      <Link href="/" className={linkClass('/')}>
        <LayoutDashboard className="w-4 h-4" />
        Dashboard
      </Link>
      <Link href="/calendario" className={linkClass('/calendario')}>
        <CalendarDays className="w-4 h-4" />
        Calendario
      </Link>
    </nav>
  );
}
