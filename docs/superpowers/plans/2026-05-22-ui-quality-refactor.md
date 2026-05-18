# UI Quality & Tailwind Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the codebase by converting inline styles to Tailwind utility classes, replacing JS hover handlers with CSS, and standardizing theme variables.

**Architecture:** Design System Driven. Enhance `globals.css` with semantic tokens and component classes, then systematically refactor React components to use these centralized definitions.

**Tech Stack:** Next.js, Tailwind CSS 4, TypeScript.

---

### Task 1: Theme & Global Styles Enhancement

**Files:**
- Modify: `cartolalab/src/app/globals.css`

- [ ] **Step 1: Update `@theme` block and add component classes**

Update `cartolalab/src/app/globals.css` to include new semantic tokens and helper classes.

```css
@import "tailwindcss";

@theme {
  --color-bg-primary: #0A0F1A;
  --color-bg-secondary: #111827;
  --color-bg-card: #1A2235;
  --color-bg-hover: #243049;
  --color-border: #2A3650;
  --color-border-bright: #3B5068;
  
  --color-accent: #00FF88;
  --color-accent-dim: #00CC6A;
  --color-accent-glow: rgba(0, 255, 136, 0.15);
  
  --color-text-primary: #F0F4F8;
  --color-text-secondary: #8B9DC3;
  --color-text-dim: #5A6E8A;
  
  --color-positive: #00FF88;
  --color-negative: #FF4D6A;
  --color-warning: #FFB800;
  --color-info: #4DA6FF;
  
  --color-goleiro: #FF6B35;
  --color-lateral: #4DA6FF;
  --color-zagueiro: #A855F7;
  --color-meia: #00FF88;
  --color-atacante: #FF4D6A;
  --color-tecnico: #FFB800;
  
  --font-display: 'Inter', system-ui, -apple-system, sans-serif;
  --font-body: 'Inter', system-ui, -apple-system, sans-serif;
  
  --shadow-hard: 4px 4px 0px rgba(0, 255, 136, 0.2);
  --shadow-card: 0 2px 16px rgba(0, 0, 0, 0.3);
  --shadow-glow: 0 0 20px rgba(0, 255, 136, 0.1);

  --color-bg-deep: #0A0F1A;
  --color-glass-bg: rgba(255, 255, 255, 0.03);
  --color-glass-border: rgba(255, 255, 255, 0.08);
  --color-accent-gold: #FFB800;

  --shadow-premium: 0 8px 32px rgba(0, 0, 0, 0.4);

  /* New semantic tokens */
  --blur-header: 16px;
  --blur-card: 12px;
  --glass-bg-header: rgba(10, 15, 26, 0.8);
  --border-accent-glow: rgba(0, 255, 136, 0.2);
}

@layer base {
  /* ... existing base styles ... */
}

@layer components {
  /* Existing glass-panel ... */
  .glass-panel {
    background: var(--color-glass-bg);
    backdrop-filter: blur(var(--blur-card));
    border: 1px solid var(--color-glass-border);
    border-radius: 16px;
  }

  .container-max {
    @apply max-w-[1400px] mx-auto px-6;
  }

  .glass-header {
    @apply sticky top-0 z-50;
    background: var(--glass-bg-header);
    backdrop-filter: blur(var(--blur-header));
    border-bottom: 1px solid var(--color-glass-border);
  }

  .interactive-row {
    @apply transition-colors duration-150 hover:bg-[var(--color-bg-hover)];
  }

  .interactive-card {
    @apply transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-[var(--shadow-premium)];
  }

  /* ... rest of components ... */
}
```

- [ ] **Step 2: Commit changes**

```bash
git add cartolalab/src/app/globals.css
git commit -m "style: enhance theme tokens and add component utilities"
```

---

### Task 2: Header Refactor

**Files:**
- Modify: `cartolalab/src/components/Header.tsx`

- [ ] **Step 1: Replace inline styles with classes**

```tsx
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
```

- [ ] **Step 2: Commit changes**

```bash
git add cartolalab/src/components/Header.tsx
git commit -m "style: refactor Header to use Tailwind and component classes"
```

---

### Task 3: RankingCard Refactor

**Files:**
- Modify: `cartolalab/src/components/RankingCard.tsx`

- [ ] **Step 1: Replace table inline styles and JS hover handlers**

```tsx
export default function RankingCard({
  title,
  atletas,
  metric,
  metricLabel,
}: {
  title: string;
  atletas: AtletaEnriquecido[];
  metric: string;
  metricLabel: string;
}) {
  return (
    <div className="glass-panel p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-glass-border)] font-bold text-[0.9rem] bg-white/[0.02]">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--color-bg-secondary)]">
              <th className="table-header text-left pl-4 w-[30px]">#</th>
              <th className="table-header text-left">Jogador</th>
              <th className="table-header text-center">Pos</th>
              <th className="table-header text-right">Preço</th>
              <th className="table-header active text-right pr-4">{metricLabel}</th>
            </tr>
          </thead>
          <tbody>
            {atletas.map((a, i) => {
              // ... logic ...
              return (
                <tr key={a.atleta_id} className="interactive-row">
                  <td className="table-cell pl-4 text-[var(--color-text-dim)] font-bold">
                    {i + 1}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {/* ... img ... */}
                      <div>
                        <div className="font-semibold text-[0.85rem]">{a.apelido}</div>
                        <div className="text-[0.7rem] text-[var(--color-text-dim)]">{a.clube?.apelido}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-center">
                    <span
                      className="badge text-[0.65rem]"
                      style={{
                        color: POS_COLORS[a.posicao_id] || 'var(--color-text-secondary)',
                        borderColor: POS_COLORS[a.posicao_id] || 'var(--color-border)',
                        background: `${POS_COLORS[a.posicao_id] || 'var(--color-border)'}15`,
                      }}
                    >
                      {a.posicao?.abreviacao?.toUpperCase()}
                    </span>
                  </td>
                  <td className="table-cell text-right text-[var(--color-text-secondary)]">
                    C$ {a.preco_num.toFixed(2)}
                  </td>
                  <td
                    className={`table-cell text-right pr-4 font-bold ${isPositive ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}
                  >
                    {typeof val === 'number' ? val.toFixed(2) : val}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit changes**

```bash
git add cartolalab/src/components/RankingCard.tsx
git commit -m "style: refactor RankingCard to use Tailwind and interactive-row class"
```

---

### Task 4: EmAlta Refactor

**Files:**
- Modify: `cartolalab/src/components/EmAlta.tsx`

- [ ] **Step 1: Replace grid inline styles and JS hover handlers**

```tsx
export default function EmAlta({ atletas }: EmAltaProps) {
  if (!atletas.length) return null;

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 mb-12">
      {atletas.map((atleta) => {
        const delta = atleta.deltaMomento;
        return (
          <div key={atleta.atleta_id} className="glass-panel p-5 interactive-card cursor-default">
            <div className="flex items-center gap-2.5 mb-3.5">
              {/* ... img ... */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[0.85rem] whitespace-nowrap overflow-hidden text-ellipsis">{atleta.apelido}</div>
                <div className="text-[0.7rem] text-[var(--color-text-dim)]">{atleta.clube?.nome_fantasia}</div>
              </div>
              <span 
                className={`rounded-full px-2 py-0.5 text-[0.7rem] font-extrabold border ${
                  delta > 0 
                    ? 'bg-[rgba(0,255,136,0.15)] text-[var(--color-positive)] border-[rgba(0,255,136,0.3)]' 
                    : 'bg-[rgba(255,77,106,0.15)] text-[var(--color-negative)] border-[rgba(255,77,106,0.3)]'
                }`}
              >
                {delta > 0 ? '+' : ''}{delta.toFixed(2)}
              </span>
            </div>
            {/* ... Sparkline ... */}
            <div className="flex justify-between mt-2.5 text-[0.7rem]">
              <span className="text-[var(--color-text-dim)]">
                Média: <strong className="text-[var(--color-text-primary)]">{atleta.mediaGeralPeriodo?.toFixed(2)}</strong>
              </span>
              <span className="text-[var(--color-positive)]">
                Momento: <strong>{atleta.indiceMomento?.toFixed(2)}</strong>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit changes**

```bash
git add cartolalab/src/components/EmAlta.tsx
git commit -m "style: refactor EmAlta to use Tailwind and interactive-card class"
```

---

### Task 5: Dashboard Page Refactor

**Files:**
- Modify: `cartolalab/src/app/page.tsx`

- [ ] **Step 1: Wrap in container-max and refactor inline styles**

```tsx
export default async function DashboardPage() {
  // ... data fetching ...

  return (
    <div className="container-max py-6">
      {/* Market Status Banner */}
      <div
        className="card-glow mb-8 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6"
        style={{ borderColor: mercadoAberto ? 'var(--color-accent)' : 'var(--color-warning)' }}
      >
        <div>
          <p className="stat-label">Status do Mercado</p>
          <p 
            className="stat-value mt-1" 
            style={{ color: mercadoAberto ? 'var(--color-accent)' : 'var(--color-warning)' }}
          >
            {mercadoAberto ? 'Aberta' : 'Fechado'}
          </p>
        </div>
        {/* ... other stats ... */}
      </div>

      <h2 className="text-2xl font-extrabold mb-4 mt-8 gradient-text">
        🔥 Em Alta — Maior Momento
      </h2>
      <p className="text-[var(--color-text-dim)] text-[0.85rem] mb-6">
        Jogadores com maior Índice de Momento nas últimas 3 rodadas vs. média histórica
      </p>
      <EmAlta atletas={emAlta} />

      <h2 className="text-2xl font-extrabold mb-6 mt-8 gradient-text">
        🎯 Melhores Oportunidades por Posição (Previsão IA)
      </h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6 mb-12">
        {/* RankingCards */}
      </div>

      <h2 className="text-2xl font-extrabold mb-6 gradient-text">
        📊 Rankings Gerais
      </h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,640px),1fr))] gap-6">
        {/* RankingCards */}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit changes**

```bash
git add cartolalab/src/app/page.tsx
git commit -m "style: refactor Dashboard page to use container-max and Tailwind utilities"
```

---

### Task 6: Cleanup of Remaining Client Components

**Files:**
- Modify: `cartolalab/src/app/jogadores/JogadoresClient.tsx`
- Modify: `cartolalab/src/app/times/TimesClient.tsx`
- Modify: `cartolalab/src/app/comparar/CompararClient.tsx`
- Modify: `cartolalab/src/app/escalacao/EscalacaoClient.tsx`

- [ ] **Step 1: Systematic removal of inline styles and JS hover handlers**

Iterate through these files and replace inline styles/JS handlers with Tailwind and global component classes.

- [ ] **Step 2: Commit changes**

```bash
git add cartolalab/src/app/jogadores/JogadoresClient.tsx cartolalab/src/app/times/TimesClient.tsx cartolalab/src/app/comparar/CompararClient.tsx cartolalab/src/app/escalacao/EscalacaoClient.tsx
git commit -m "style: complete refactor of all remaining client components"
```
