# Premium Pro Table Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the player listing table to a "Bloomberg Edition" high-density, professional UI with Glassmorphism, sticky headers/columns, and enhanced visual indicators.

**Architecture:** Refactor the existing `JogadoresClient.tsx` to use a modern, high-density table structure. Utilize Tailwind CSS for styling and Framer Motion for subtle transitions. Maintain all existing data points while adding sparklines and sticky navigation.

**Tech Stack:** Next.js (App Router), Tailwind CSS 4, Framer Motion, Lucide React.

---

### Task 1: Update Theme Variables & Base Styles

**Files:**
- Modify: `cartolalab/src/app/globals.css`

- [ ] **Step 1: Add Premium theme variables**

```css
@theme {
  /* ... existing ... */
  --color-bg-deep: #0A0F1A;
  --color-glass-bg: rgba(255, 255, 255, 0.03);
  --color-glass-border: rgba(255, 255, 255, 0.08);
  --color-accent-gold: #FFB800;
  
  --shadow-premium: 0 8px 32px rgba(0, 0, 0, 0.4);
}

@layer components {
  .glass-panel {
    background: var(--color-glass-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--color-glass-border);
    border-radius: 16px;
  }

  .table-pro-container {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-glass-border);
    border-radius: 12px;
    overflow: hidden;
  }
}
```

- [ ] **Step 2: Commit theme changes**

```bash
git add cartolalab/src/app/globals.css
git commit -m "style: add premium theme variables and glass-panel components"
```

---

### Task 2: Refactor Table Header & Sticky Structure

**Files:**
- Modify: `cartolalab/src/app/jogadores/JogadoresClient.tsx`

- [ ] **Step 1: Update table container and headers**

```tsx
// Inside JogadoresClient return, replace the Data Table section:
<div className="table-pro-container" style={{ position: 'relative' }}>
  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1600px', fontVariantNumeric: 'tabular-nums' }}>
      <thead>
        <tr style={{ 
          background: 'rgba(255,255,255,0.02)', 
          borderBottom: '1px solid var(--color-glass-border)',
          position: 'sticky',
          top: 0,
          backdropFilter: 'blur(10px)',
          zIndex: 30
        }}>
          <th className="table-header" style={{ textAlign: 'left', paddingLeft: '1rem', width: '40px' }}>#</th>
          <th className="table-header" style={{ 
            textAlign: 'left', 
            minWidth: '200px',
            position: 'sticky',
            left: 0,
            background: 'var(--color-bg-secondary)',
            zIndex: 31
          }}>Atleta</th>
          <th className="table-header" style={{ textAlign: 'center' }}>Pos</th>
          <th className="table-header" style={{ textAlign: 'right' }}>J</th>
          {/* ... Add all columns matching the Design Doc ... */}
          <th className="table-header" style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Momento</th>
        </tr>
      </thead>
      {/* ... tbody ... */}
    </table>
  </div>
</div>
```

- [ ] **Step 2: Commit header changes**

```bash
git add cartolalab/src/app/jogadores/JogadoresClient.tsx
git commit -m "feat: implement sticky headers and athlete column in players table"
```

---

### Task 3: Implement Premium Row Styling & Detail Expansion

**Files:**
- Modify: `cartolalab/src/app/jogadores/JogadoresClient.tsx`

- [ ] **Step 1: Update PlayerRow component for high density**

```tsx
function PlayerRow({ atleta: a, index, isExpanded, onToggle }: { atleta: AtletaEnriquecido; index: number; isExpanded: boolean; onToggle: () => void }) {
  // Use established color logic from existing code
  const statusColor = STATUS_COLORS[a.status_id] || 'var(--color-text-dim)';
  
  return (
    <>
      <tr
        onClick={onToggle}
        className="group"
        style={{ 
          cursor: 'pointer', 
          transition: 'background 0.15s', 
          borderBottom: '1px solid rgba(255,255,255,0.03)',
          background: isExpanded ? 'rgba(0, 255, 136, 0.05)' : 'transparent'
        }}
      >
        <td className="table-cell" style={{ paddingLeft: '1rem', color: 'var(--color-text-dim)', fontSize: '0.75rem' }}>
          {index + 1}
        </td>
        <td className="table-cell" style={{ 
          position: 'sticky', 
          left: 0, 
          background: 'inherit', // Important to match row background
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             <img src={a.clube?.escudos?.['30x30']} alt="" style={{ width: 24, height: 24 }} />
             <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'white' }}>{a.apelido}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>{a.clube?.abreviacao}</div>
             </div>
          </div>
        </td>
        {/* ... All metrics with proper styling and colors ... */}
        <td className="table-cell" style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
          <Sparkline history={a.roundHistory || []} />
        </td>
      </tr>
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={17} style={{ padding: 0 }}>
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-bg-deep/50 p-6"
              >
                {/* Detailed scouts view */}
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Verify linting and build**

```bash
cd cartolalab && npm run lint && npm run build
```

- [ ] **Step 3: Commit row changes**

```bash
git add cartolalab/src/app/jogadores/JogadoresClient.tsx
git commit -m "feat: add premium row styling and expansion animation"
```

---

### Task 4: UI/UX Final Polish (Filtros & Dashboard)

**Files:**
- Modify: `cartolalab/src/app/jogadores/JogadoresClient.tsx`
- Modify: `cartolalab/src/components/Header.tsx`

- [ ] **Step 1: Apply glass-panel to filters and header**

- [ ] **Step 2: Final visual verification**

- [ ] **Step 3: Commit final polish**

```bash
git commit -m "style: final UI/UX polish with glassmorphism on filters and header"
```
