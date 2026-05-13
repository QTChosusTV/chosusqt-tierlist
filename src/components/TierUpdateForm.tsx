'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MODES } from '@/types/tierlist';
import { getTierColor } from '@/lib/colors';

const TIERS = ['HT1','LT1','HT2','LT2','HT3','LT3','HT4','LT4','HT5','LT5','HT6','LT6','U'];

const MODE_TO_COLUMN: Record<string, string> = {
  axe: 'axe', sword: 'sword', nethop: 'nethop', smp: 'smp',
  mace: 'mace', vanilla: 'vanilla', diapot: 'diapot', uhc: 'uhc',
};

interface Fight {
  player1: string; player2: string;
  score1: number | ''; score2: number | '';
  tier1: string; tier2: string;
}

interface TierUpdateFormProps {
  defaultTester: string;
  defaultContestant: string;
  defaultMode: string;
}

// ── Shared style tokens ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 0, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  color: '#fff', fontSize: 13, outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  background: '#111118',
  colorScheme: 'dark',
};

const labelStyle: React.CSSProperties = {
  fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  marginBottom: 5, display: 'block',
};

// ─────────────────────────────────────────────────────────────────────────────

export default function TierUpdateForm({ defaultTester, defaultContestant, defaultMode }: TierUpdateFormProps) {
  const [tester, setTester] = useState(defaultTester);
  const [contestant, setContestant] = useState(defaultContestant);
  const [mode, setMode] = useState(defaultMode);
  const [newTier, setNewTier] = useState('');
  const [oldTier, setOldTier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fights, setFights] = useState<Fight[]>([
    { player1: defaultTester, player2: defaultContestant, score1: '', score2: '', tier1: '', tier2: '' },
  ]);

  useEffect(() => {
    setTester(defaultTester);
    setContestant(defaultContestant);
    setMode(defaultMode);
    setFights([{ player1: defaultTester, player2: defaultContestant, score1: '', score2: '', tier1: '', tier2: '' }]);
    setNewTier(''); setOldTier('');
    setSuccess(false); setError(null);
  }, [defaultContestant, defaultTester, defaultMode]);

  function addFight() {
    setFights(prev => [...prev, { player1: tester, player2: contestant, score1: '', score2: '', tier1: '', tier2: '' }]);
  }

  function removeFight(i: number) {
    setFights(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateFight(i: number, field: keyof Fight, value: string | number) {
    setFights(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f));
  }

  async function handleSubmit() {
    if (!contestant || !tester || !mode || !newTier) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const testArray = fights.map(f => ({
      player1: f.player1, player2: f.player2,
      score1: Number(f.score1), score2: Number(f.score2),
      tier1: f.tier1, tier2: f.tier2,
    }));

    const { error: historyError } = await supabase.from('history' as any).insert({
      tester, tested: contestant, old_tier: oldTier, new_tier: newTier, mode, test_array: testArray,
    } as any);

    if (historyError) {
      setError(historyError.message);
      setSubmitting(false);
      return;
    }

    const col = MODE_TO_COLUMN[mode.toLowerCase()];
    if (col) {
      const { data: existing } = await supabase
        .from('tiers' as any).select('username').eq('username', contestant).maybeSingle() as { data: { username: string } | null };

      if (existing) {
        await (supabase as any).from('tiers').update({ [col]: newTier.toLowerCase() }).eq('username', contestant);
      } else {
        await (supabase as any).from('tiers').insert({ username: contestant, [col]: newTier.toLowerCase() });
      }
    }

    setSuccess(true);
    setSubmitting(false);
  }

  return (
    <div style={{
      background: '#0d0d12',
      border: '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden',
    }}>
      {/* Form header */}
      <div style={{
        padding: '9px 16px',
        background: '#111118',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
      }}>
        Submit Tier Update
      </div>

      <div style={{ padding: '16px' }}>
        {/* Row 1: Tester + Contestant */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <label style={labelStyle}>Tester</label>
            <input style={inputStyle} value={tester} onChange={e => setTester(e.target.value)} placeholder="Tester" />
          </div>
          <div>
            <label style={labelStyle}>Contestant</label>
            <input style={inputStyle} value={contestant} onChange={e => setContestant(e.target.value)} placeholder="Contestant" />
          </div>
        </div>

        {/* Row 2: Mode + Old Tier + New Tier */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Mode</label>
            <select style={selectStyle} value={mode} onChange={e => setMode(e.target.value)}>
              <option value="">Select mode</option>
              {MODES.map(m => <option key={m.key} value={m.key}>{m.key.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Old Tier</label>
            <select
              style={{ ...selectStyle, color: oldTier ? getTierColor(oldTier) : 'rgba(255,255,255,0.3)' }}
              value={oldTier} onChange={e => setOldTier(e.target.value)}
            >
              <option value="">— none —</option>
              {TIERS.map(t => (
                <option key={t} value={t} style={{ color: getTierColor(t), background: '#111118' }}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>New Tier</label>
            <select
              style={{ ...selectStyle, color: newTier ? getTierColor(newTier) : 'rgba(255,255,255,0.3)', fontWeight: newTier ? 800 : 400 }}
              value={newTier} onChange={e => setNewTier(e.target.value)}
            >
              <option value="">Select tier</option>
              {TIERS.map(t => (
                <option key={t} value={t} style={{ color: getTierColor(t), background: '#111118' }}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fights section */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={labelStyle}>Fights</span>
            <button onClick={addFight} style={{
              padding: '3px 10px', borderRadius: 0,
              border: '1px solid rgba(74,163,255,0.3)',
              background: 'rgba(74,163,255,0.08)',
              color: '#4aa3ff', fontWeight: 700, fontSize: 11,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,163,255,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(74,163,255,0.08)')}
            >
              + Add
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {fights.map((fight, i) => (
              <div key={i} style={{
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: '2px solid rgba(74,163,255,0.3)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Fight #{i + 1}
                  </span>
                  {fights.length > 1 && (
                    <button onClick={() => removeFight(i)} style={{
                      background: 'none', border: 'none',
                      color: 'rgba(255,85,85,0.5)', cursor: 'pointer', fontSize: 13, padding: 0,
                      transition: 'color 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ff5555')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,85,85,0.5)')}
                    >✕</button>
                  )}
                </div>

                {/* Player names */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                  <input style={inputStyle} value={fight.player1} onChange={e => updateFight(i, 'player1', e.target.value)} placeholder="Player 1" />
                  <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, textAlign: 'center', letterSpacing: '0.06em' }}>VS</span>
                  <input style={inputStyle} value={fight.player2} onChange={e => updateFight(i, 'player2', e.target.value)} placeholder="Player 2" />
                </div>

                {/* Scores */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                  <input style={{ ...inputStyle, textAlign: 'center', fontWeight: 700 }}
                    type="number" min={0} value={fight.score1}
                    onChange={e => updateFight(i, 'score1', e.target.value)} placeholder="0" />
                  <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 14, textAlign: 'center', fontWeight: 700 }}>—</span>
                  <input style={{ ...inputStyle, textAlign: 'center', fontWeight: 700 }}
                    type="number" min={0} value={fight.score2}
                    onChange={e => updateFight(i, 'score2', e.target.value)} placeholder="0" />
                </div>

                {/* Tiers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center' }}>
                  <select style={{ ...selectStyle, color: fight.tier1 ? getTierColor(fight.tier1) : 'rgba(255,255,255,0.25)', fontWeight: fight.tier1 ? 700 : 400 }}
                    value={fight.tier1} onChange={e => updateFight(i, 'tier1', e.target.value)}>
                    <option value="">P1 tier</option>
                    {TIERS.map(t => <option key={t} value={t} style={{ color: getTierColor(t), background: '#111118' }}>{t}</option>)}
                  </select>
                  <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, textAlign: 'center' }}>—</span>
                  <select style={{ ...selectStyle, color: fight.tier2 ? getTierColor(fight.tier2) : 'rgba(255,255,255,0.25)', fontWeight: fight.tier2 ? 700 : 400 }}
                    value={fight.tier2} onChange={e => updateFight(i, 'tier2', e.target.value)}>
                    <option value="">P2 tier</option>
                    {TIERS.map(t => <option key={t} value={t} style={{ color: getTierColor(t), background: '#111118' }}>{t}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error / success banners */}
        {error && (
          <div style={{
            fontSize: 12, color: '#ff6b8a',
            background: 'rgba(255,107,138,0.06)',
            border: '1px solid rgba(255,107,138,0.2)',
            borderLeft: '3px solid #ff6b8a',
            padding: '8px 12px', marginBottom: 10,
          }}>{error}</div>
        )}
        {success && (
          <div style={{
            fontSize: 12, color: '#4ade80',
            background: 'rgba(74,222,128,0.06)',
            border: '1px solid rgba(74,222,128,0.2)',
            borderLeft: '3px solid #4ade80',
            padding: '8px 12px', marginBottom: 10,
            letterSpacing: '0.04em',
          }}>✓ Tier updated successfully!</div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || success}
          style={{
            width: '100%', padding: '11px', borderRadius: 0, border: 'none',
            background: success
              ? 'rgba(74,222,128,0.12)'
              : submitting
              ? 'rgba(74,163,255,0.2)'
              : 'linear-gradient(135deg, #4aa3ff, #b56bff)',
            color: success ? '#4ade80' : '#fff',
            fontWeight: 800, fontSize: 12,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: submitting || success ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {submitting ? 'Submitting...' : success ? '✓ Submitted' : 'Submit Tier Update'}
        </button>
      </div>
    </div>
  );
}