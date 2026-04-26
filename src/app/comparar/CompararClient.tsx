'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { AtletaEnriquecido, Clube } from '@/types/cartola';
import { POSICAO_NAMES, type PosicaoId, STATUS_COLORS } from '@/types/cartola';
import { calcularScoutPoints } from '@/lib/indicators';
import { Search, X, Plus, Minus as MinusIcon } from 'lucide-react';
import { POS_COLORS, SCOUT_LABELS } from '@/lib/constants';

interface CompararClientProps {
  atletas: AtletaEnriquecido[];
  clubes: Record<string, Clube>;
}

export default function CompararClient({ atletas, clubes }: CompararClientProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const searchResults = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return atletas
      .filter((a) =>
        (a.apelido.toLowerCase().includes(q) || a.nome.toLowerCase().includes(q) || a.clube?.apelido?.toLowerCase().includes(q)) &&
        !selected.includes(a.atleta_id)
      )
      .slice(0, 10);
  }, [atletas, search, selected]);

  const selectedAtletas = useMemo(() => {
    return selected.map((id) => atletas.find((a) => a.atleta_id === id)!).filter(Boolean);
  }, [atletas, selected]);

  const addPlayer = (id: number) => {
    if (selected.length < 4 && !selected.includes(id)) {
      setSelected([...selected, id]);
      setSearch('');
      setShowPicker(false);
    }
  };

  const removePlayer = (id: number) => {
    setSelected(selected.filter((s) => s !== id));
  };

  // Find all unique scout keys across selected players
  const allScoutKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const a of selectedAtletas) {
      if (a.scout) {
        Object.keys(a.scout).forEach((k) => keys.add(k));
      }
    }
    return Array.from(keys).sort();
  }, [selectedAtletas]);

  const metrics = [
    { key: 'media_num', label: 'Média Geral', format: (v: number) => v.toFixed(2) },
    { key: 'pontos_num', label: 'Última Rodada', format: (v: number) => v.toFixed(1) },
    { key: 'preco_num', label: 'Preço', format: (v: number) => `C$ ${v.toFixed(2)}` },
    { key: 'variacao_num', label: 'Variação', format: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}` },
    { key: 'custoBeneficio', label: 'Custo/Benefício', format: (v: number) => v.toFixed(2) },
    { key: 'jogos_num', label: 'Jogos', format: (v: number) => String(v) },
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }} className="gradient-text">
          Comparar Jogadores
        </h1>
        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Compare até 4 jogadores lado a lado
        </p>
      </div>

      {/* Player picker */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {selectedAtletas.map((a) => (
            <motion.div
              key={a.atleta_id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'var(--color-bg-secondary)', border: '2px solid var(--color-border)',
                borderRadius: '999px', padding: '0.375rem 0.75rem 0.375rem 0.5rem',
              }}
            >
              {a.clube?.escudos?.['30x30'] && (
                <img src={a.clube.escudos['30x30']} alt="" width={20} height={20} style={{ borderRadius: '4px' }} />
              )}
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.apelido}</span>
              <button
                onClick={() => removePlayer(a.atleta_id)}
                style={{ background: 'none', border: 'none', color: 'var(--color-negative)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}

          {selected.length < 4 && (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                <input
                  className="input-field"
                  placeholder="Adicionar jogador..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowPicker(true); }}
                  onFocus={() => setShowPicker(true)}
                  style={{ paddingLeft: '2rem', width: '220px', fontSize: '0.8rem' }}
                />
              </div>
              {showPicker && searchResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                  background: 'var(--color-bg-card)', border: '2px solid var(--color-border)',
                  borderRadius: '8px', zIndex: 20, boxShadow: 'var(--shadow-card)', maxHeight: '300px', overflowY: 'auto',
                }}>
                  {searchResults.map((a) => (
                    <button
                      key={a.atleta_id}
                      onClick={() => addPlayer(a.atleta_id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                        padding: '0.5rem 0.75rem', background: 'none', border: 'none', borderBottom: '1px solid var(--color-border)',
                        cursor: 'pointer', color: 'var(--color-text-primary)', fontSize: '0.85rem', textAlign: 'left',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {a.clube?.escudos?.['30x30'] && <img src={a.clube.escudos['30x30']} alt="" width={18} height={18} style={{ borderRadius: '3px' }} />}
                      <span style={{ fontWeight: 600 }}>{a.apelido}</span>
                      <span style={{ color: POS_COLORS[a.posicao_id], fontSize: '0.7rem', fontWeight: 700 }}>{a.posicao?.abreviacao}</span>
                      <span style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem', marginLeft: 'auto' }}>MG {a.media_num.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      {selectedAtletas.length >= 2 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {/* Player headers */}
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                  <th className="table-header" style={{ textAlign: 'left', paddingLeft: '1rem', minWidth: '120px' }}>Indicador</th>
                  {selectedAtletas.map((a) => (
                    <th key={a.atleta_id} className="table-header" style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        {a.clube?.escudos?.['30x30'] && <img src={a.clube.escudos['30x30']} alt="" width={22} height={22} style={{ borderRadius: '4px' }} />}
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{a.apelido}</span>
                        <span style={{ color: POS_COLORS[a.posicao_id], fontSize: '0.65rem', fontWeight: 700 }}>{a.posicao?.abreviacao?.toUpperCase()}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Metrics */}
                {metrics.map((m) => {
                  const getVal = (a: AtletaEnriquecido): number => {
                    switch (m.key) {
                      case 'media_num': return a.media_num;
                      case 'pontos_num': return a.pontos_num;
                      case 'preco_num': return a.preco_num;
                      case 'variacao_num': return a.variacao_num;
                      case 'custoBeneficio': return a.custoBeneficio;
                      case 'jogos_num': return a.jogos_num;
                      default: return 0;
                    }
                  };
                  const values = selectedAtletas.map(getVal);
                  const best = Math.max(...values);

                  return (
                    <tr key={m.key}>
                      <td className="table-cell" style={{ paddingLeft: '1rem', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                        {m.label}
                      </td>
                      {selectedAtletas.map((a, i) => {
                        const v = values[i];
                        const isBest = v === best && selectedAtletas.length > 1;
                        return (
                          <td key={a.atleta_id} className="table-cell" style={{ textAlign: 'center', fontWeight: 700, color: isBest ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                            {m.format(v)}
                            {isBest && <span style={{ marginLeft: '4px', fontSize: '0.7rem' }}>👑</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Scout header */}
                <tr>
                  <td colSpan={selectedAtletas.length + 1} style={{ padding: '0.5rem 1rem', background: 'var(--color-bg-secondary)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Scout Detalhado
                  </td>
                </tr>

                {/* Scout rows */}
                {allScoutKeys.map((key) => {
                  const values = selectedAtletas.map((a) => (a.scout as Record<string, number>)?.[key] || 0);
                  const best = Math.max(...values);
                  return (
                    <tr key={key}>
                      <td className="table-cell" style={{ paddingLeft: '1rem', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                        {SCOUT_LABELS[key] || key}
                      </td>
                      {selectedAtletas.map((a, i) => {
                        const v = values[i];
                        const isBest = v > 0 && v === best && selectedAtletas.length > 1;
                        return (
                          <td key={a.atleta_id} className="table-cell" style={{ textAlign: 'center', fontWeight: 600, color: isBest ? 'var(--color-accent)' : v > 0 ? 'var(--color-text-primary)' : 'var(--color-text-dim)' }}>
                            {v || '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedAtletas.length < 2 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '1.1rem', fontWeight: 600 }}>
            👆 Selecione pelo menos 2 jogadores para comparar
          </p>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Use a barra de busca acima para encontrar e adicionar jogadores
          </p>
        </div>
      )}
    </div>
  );
}
