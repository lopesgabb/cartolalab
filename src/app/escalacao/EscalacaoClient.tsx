'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AtletaEnriquecido, Clube } from '@/types/cartola';
import { POSICAO_NAMES, type PosicaoId, STATUS_COLORS } from '@/types/cartola';
import { POS_COLORS } from '@/lib/constants';
import { Search, X, Trash2, BarChart2 } from 'lucide-react';

interface EscalacaoClientProps {
  atletas: AtletaEnriquecido[];
  clubes: Record<string, Clube>;
}

const FORMATION_SLOTS: { posicao: number; label: string; emoji: string }[] = [
  { posicao: 6, label: 'Técnico', emoji: '🧠' },
  { posicao: 1, label: 'Goleiro', emoji: '🧤' },
  { posicao: 2, label: 'Lateral Dir.', emoji: '🛡️' },
  { posicao: 3, label: 'Zagueiro', emoji: '🧱' },
  { posicao: 3, label: 'Zagueiro', emoji: '🧱' },
  { posicao: 2, label: 'Lateral Esq.', emoji: '🛡️' },
  { posicao: 4, label: 'Meia', emoji: '🪄' },
  { posicao: 4, label: 'Meia', emoji: '🪄' },
  { posicao: 4, label: 'Meia', emoji: '🪄' },
  { posicao: 5, label: 'Atacante', emoji: '⚽' },
  { posicao: 5, label: 'Atacante', emoji: '⚽' },
  { posicao: 5, label: 'Atacante', emoji: '⚽' },
];

const BUDGET = 100;

export default function EscalacaoClient({ atletas, clubes }: EscalacaoClientProps) {
  const [lineup, setLineup] = useState<(AtletaEnriquecido | null)[]>(
    Array(FORMATION_SLOTS.length).fill(null)
  );
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const custoTotal = useMemo(
    () => lineup.reduce((sum, a) => sum + (a?.preco_num ?? 0), 0),
    [lineup]
  );

  const scoreTotal = useMemo(
    () => lineup.reduce((sum, a) => sum + (a?.mediaComposta ?? a?.media_num ?? 0), 0),
    [lineup]
  );

  const projecaoTotal = useMemo(
    () => lineup.reduce((sum, a) => sum + (a?.mediaGeralPeriodo ?? a?.media_num ?? 0), 0),
    [lineup]
  );

  const budgetRemaining = BUDGET - custoTotal;
  const budgetPct = Math.min(100, (custoTotal / BUDGET) * 100);

  const pickerAtletas = useMemo(() => {
    if (activeSlot === null) return [];
    const slot = FORMATION_SLOTS[activeSlot];
    const q = search.toLowerCase();
    const alreadyPickedIds = new Set(lineup.filter(Boolean).map(a => a!.atleta_id));

    return atletas
      .filter(a =>
        a.posicao_id === slot.posicao &&
        !alreadyPickedIds.has(a.atleta_id) &&
        (!q || a.apelido.toLowerCase().includes(q) || a.clube?.nome_fantasia?.toLowerCase().includes(q))
      )
      .sort((a, b) => (b.mediaComposta ?? 0) - (a.mediaComposta ?? 0))
      .slice(0, 40);
  }, [activeSlot, atletas, search, lineup]);

  const pickPlayer = useCallback((atleta: AtletaEnriquecido) => {
    if (activeSlot === null) return;
    setLineup(prev => {
      const next = [...prev];
      next[activeSlot] = atleta;
      return next;
    });
    setActiveSlot(null);
    setSearch('');
  }, [activeSlot]);

  const removePlayer = useCallback((slotIdx: number) => {
    setLineup(prev => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
  }, []);

  const clearAll = () => {
    setLineup(Array(FORMATION_SLOTS.length).fill(null));
    setActiveSlot(null);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }} className="gradient-text">
            🏟️ Simulador de Escalação
          </h1>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Monte seu time ideal dentro do orçamento de C$ {BUDGET}
          </p>
        </div>
        <button
          onClick={clearAll}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.3)', color: 'var(--color-negative)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.15s' }}
        >
          <Trash2 size={14} /> Limpar Escalação
        </button>
      </div>

      {/* Stats Bar */}
      <div className="card-glow" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div>
          <p className="stat-label">Custo Total</p>
          <p className="stat-value" style={{ color: budgetRemaining < 0 ? 'var(--color-negative)' : 'var(--color-text-primary)', marginTop: '0.25rem' }}>
            C$ {custoTotal.toFixed(2)}
          </p>
          {/* Budget bar */}
          <div style={{ marginTop: '0.5rem', background: 'var(--color-bg-hover)', borderRadius: '999px', height: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${budgetPct}%`, height: '100%', background: budgetRemaining < 0 ? 'var(--color-negative)' : 'var(--color-accent)', borderRadius: '999px', transition: 'width 0.3s ease' }} />
          </div>
        </div>
        <div>
          <p className="stat-label">Saldo</p>
          <p className="stat-value" style={{ color: budgetRemaining >= 0 ? 'var(--color-positive)' : 'var(--color-negative)', marginTop: '0.25rem' }}>
            C$ {budgetRemaining.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="stat-label">Score Total</p>
          <p className="stat-value" style={{ color: 'var(--color-accent)', marginTop: '0.25rem' }}>
            {scoreTotal.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="stat-label">Projeção (Média Hist.)</p>
          <p className="stat-value" style={{ marginTop: '0.25rem' }}>
            {projecaoTotal.toFixed(2)} pts
          </p>
        </div>
        <div>
          <p className="stat-label">Jogadores</p>
          <p className="stat-value" style={{ marginTop: '0.25rem' }}>
            {lineup.filter(Boolean).length} / {FORMATION_SLOTS.length}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: activeSlot !== null ? '1fr 380px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Formation Grid */}
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Técnico */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SlotCard
                idx={0}
                slot={FORMATION_SLOTS[0]}
                player={lineup[0]}
                isActive={activeSlot === 0}
                onSelect={() => { setActiveSlot(0); setSearch(''); }}
                onRemove={() => removePlayer(0)}
              />
            </div>

            {/* Goleiro */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SlotCard
                idx={1}
                slot={FORMATION_SLOTS[1]}
                player={lineup[1]}
                isActive={activeSlot === 1}
                onSelect={() => { setActiveSlot(1); setSearch(''); }}
                onRemove={() => removePlayer(1)}
              />
            </div>

            {/* Defensores (lat + zag + lat) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {[2, 3, 4, 5].map(idx => (
                <SlotCard
                  key={idx}
                  idx={idx}
                  slot={FORMATION_SLOTS[idx]}
                  player={lineup[idx]}
                  isActive={activeSlot === idx}
                  onSelect={() => { setActiveSlot(idx); setSearch(''); }}
                  onRemove={() => removePlayer(idx)}
                />
              ))}
            </div>

            {/* Meias */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {[6, 7, 8].map(idx => (
                <SlotCard
                  key={idx}
                  idx={idx}
                  slot={FORMATION_SLOTS[idx]}
                  player={lineup[idx]}
                  isActive={activeSlot === idx}
                  onSelect={() => { setActiveSlot(idx); setSearch(''); }}
                  onRemove={() => removePlayer(idx)}
                />
              ))}
            </div>

            {/* Atacantes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {[9, 10, 11].map(idx => (
                <SlotCard
                  key={idx}
                  idx={idx}
                  slot={FORMATION_SLOTS[idx]}
                  player={lineup[idx]}
                  isActive={activeSlot === idx}
                  onSelect={() => { setActiveSlot(idx); setSearch(''); }}
                  onRemove={() => removePlayer(idx)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Player Picker Panel */}
        <AnimatePresence>
          {activeSlot !== null && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              style={{ position: 'sticky', top: '80px' }}
            >
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {FORMATION_SLOTS[activeSlot].emoji} {FORMATION_SLOTS[activeSlot].label}
                  </h3>
                  <button
                    onClick={() => { setActiveSlot(null); setSearch(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-dim)' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar jogador..."
                    style={{ width: '100%', paddingLeft: '2.25rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Player List */}
                <div style={{ maxHeight: '55vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {pickerAtletas.length === 0 ? (
                    <div style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: '2rem', fontSize: '0.85rem' }}>
                      Nenhum jogador encontrado
                    </div>
                  ) : pickerAtletas.map(a => {
                    const statusColor = STATUS_COLORS[a.status_id] ?? 'var(--color-text-dim)';
                    const posColor = POS_COLORS[a.posicao_id];
                    return (
                      <button
                        key={a.atleta_id}
                        onClick={() => pickPlayer(a)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', background: 'var(--color-bg-hover)', border: '1px solid transparent', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%' }}
                        onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = posColor ?? 'var(--color-border)'; }}
                        onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'; }}
                      >
                        {a.clube?.escudos?.['30x30'] && (
                          <img src={a.clube.escudos['30x30']} alt={a.clube.abreviacao} width={20} height={20} style={{ borderRadius: '4px', flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.apelido}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', display: 'flex', gap: '0.5rem' }}>
                            <span>{a.clube?.abreviacao}</span>
                            <span style={{ color: statusColor }}>●</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>C$ {a.preco_num.toFixed(2)}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                            <BarChart2 size={10} style={{ display: 'inline', marginRight: '2px' }} />
                            {(a.mediaComposta ?? a.media_num)?.toFixed(2)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SlotCard({
  idx, slot, player, isActive, onSelect, onRemove,
}: {
  idx: number;
  slot: typeof FORMATION_SLOTS[number];
  player: AtletaEnriquecido | null;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const posColor = POS_COLORS[slot.posicao] ?? 'var(--color-accent)';

  return (
    <div
      style={{
        position: 'relative',
        background: isActive ? `${posColor}18` : player ? 'var(--color-bg-secondary)' : 'var(--color-bg-secondary)',
        border: `2px solid ${isActive ? posColor : player ? `${posColor}66` : 'var(--color-border)'}`,
        borderRadius: '12px',
        padding: '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        minWidth: '140px',
        maxWidth: '200px',
      }}
      onClick={() => !player && onSelect()}
    >
      {player ? (
        <div>
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            style={{ position: 'absolute', top: '0.375rem', right: '0.375rem', background: 'rgba(255,77,106,0.15)', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px 4px', color: 'var(--color-negative)', lineHeight: 1 }}
          >
            <X size={10} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
            {player.clube?.escudos?.['30x30'] && (
              <img src={player.clube.escudos['30x30']} alt="" width={18} height={18} style={{ borderRadius: '3px' }} />
            )}
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: posColor }}>{slot.emoji} {slot.label}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.25rem' }}>{player.apelido}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>C$ {player.preco_num.toFixed(2)}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent)' }}>
              {(player.mediaComposta ?? player.media_num)?.toFixed(2)}
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '72px', gap: '0.375rem' }}
          onClick={onSelect}
        >
          <span style={{ fontSize: '1.5rem' }}>{slot.emoji}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', fontWeight: 600 }}>{slot.label}</span>
          <span style={{ fontSize: '0.65rem', color: posColor, fontWeight: 700 }}>+ Adicionar</span>
        </div>
      )}
    </div>
  );
}
