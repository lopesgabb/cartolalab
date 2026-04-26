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
    <header
      style={{
        background: 'var(--color-bg-secondary)',
        borderBottom: '2px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(12px)',
      }}
    >
      <nav
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <span style={{ fontSize: '1.5rem' }}>⚽</span>
          <span
            style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}
            className="gradient-text"
          >
            CartolaLab
          </span>
        </Link>

        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  background: isActive ? 'var(--color-accent-glow)' : 'transparent',
                  transition: 'all 0.15s',
                }}
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
