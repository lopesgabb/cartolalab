'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/jogadores', label: 'Jogadores' },
  { href: '/times', label: 'Times' },
  { href: '/comparar', label: 'Comparar' },
  { href: '/escalacao', label: '🏟️ Escalação' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="glass-header">
      <nav className="container-max flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <span className="text-2xl">⚽</span>
          <span className="text-xl font-extrabold tracking-tight gradient-text">
            CartolaLab
          </span>
        </Link>

        <div className="flex gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-semibold no-underline transition-all duration-200 
                  ${isActive 
                    ? 'text-[var(--color-accent)] bg-[var(--color-accent-glow)] border border-[var(--border-accent-glow)]' 
                    : 'text-[var(--color-text-secondary)] bg-transparent border border-transparent hover:bg-white/5 hover:text-white'
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
