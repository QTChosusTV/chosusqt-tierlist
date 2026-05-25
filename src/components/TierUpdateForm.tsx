'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MODES } from '@/types/tierlist';
import { getTierColor } from '@/lib/colors';

const TIERS = ['HT1','LT1','HT2','LT2','HT3','LT3','HT4','LT4','HT5','LT5','HT6','LT6','U'];

const TIER_SCALE = [
  'LT6','HT6','LT5','HT5','LT4','HT4',
  'LT3','HT3','LT2','HT2','LT1','HT1',
];

const MODE_TO_COLUMN: Record<string, string> = {
  axe: 'axe', sword: 'sword', nethop: 'nethop', smp: 'smp',
  mace: 'mace', vanilla: 'vanilla', diapot: 'diapot', uhc: 'uhc',
};

const MODE_TO_COEFF_COLUMN: Record<string, string> = {
  axe: 'axe_coeff', sword: 'sword_coeff', nethop: 'nethop_coeff', smp: 'smp_coeff',
  mace: 'mace_coeff', vanilla: 'vanilla_coeff', diapot: 'diapot_coeff', uhc: 'uhc_coeff',
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

interface FightCoeffResult {
  fightIndex: number;
  player1: string;
  player2: string;
  score1: number;
  score2: number;
  opponentTier: string;
  testedTier: string;
  relation: 'same' | 'higher' | 'lower';
  outcome: 'win' | 'loss';
  delta: number;
  isValidation: boolean;
}

interface ConfirmationData {
  sessionCoeff: number;
  oldCumulativeCoeff: number;
  newCumulativeCoeff: number;
  fightResults: FightCoeffResult[];
  willPromote: boolean;
  willDemote: boolean;
  isHighTest: boolean;
  promotionTier: string;
  demotionTier: string;
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

// ── Coeff helpers ─────────────────────────────────────────────────────────────

function getTierRank(tier: string): number {
  return TIER_SCALE.indexOf(tier.toUpperCase());
}

function isHighTestEntry(fights: Fight[], tested: string, tester: string): boolean {
  if (tester === 'System') return true;
  if ((fights.length ?? 0) > 1) return true;
  if (fights.length === 1) {
    const fight = fights[0];
    const testedIsP1 = fight.player1 === tested;
    const testedTier = testedIsP1 ? fight.tier1 : fight.tier2;
    const opponentTier = testedIsP1 ? fight.tier2 : fight.tier1;
    if (testedTier && opponentTier) {
      const lt3Index = TIER_SCALE.indexOf('LT3');
      const testedRank = getTierRank(testedTier);
      const opponentRank = getTierRank(opponentTier);
      return testedRank >= lt3Index && opponentRank >= testedRank;
    }
  }
  return false;
}

function calcFightCoeff(
  fight: Fight,
  tested: string,
  fightIndex: number,
  isValidation: boolean,
): FightCoeffResult | null {
  const testedIsP1 = fight.player1 === tested;
  const testedTier = testedIsP1 ? fight.tier1 : fight.tier2;
  const opponentTier = testedIsP1 ? fight.tier2 : fight.tier1;
  const testedScore = testedIsP1 ? Number(fight.score1) : Number(fight.score2);
  const oppScore = testedIsP1 ? Number(fight.score2) : Number(fight.score1);

  if (!testedTier || !opponentTier) return null;

  const testedRank = getTierRank(testedTier);
  const oppRank = getTierRank(opponentTier);
  const diff = oppRank - testedRank;

  const relation: 'same' | 'higher' | 'lower' =
    diff === 0 ? 'same' : diff > 0 ? 'higher' : 'lower';

  const outcome: 'win' | 'loss' = testedScore > oppScore ? 'win' : 'loss';

  let delta = 0;
  if (!isValidation) {
    const testedScore = testedIsP1 ? Number(fight.score1) : Number(fight.score2);
    const oppScore    = testedIsP1 ? Number(fight.score2) : Number(fight.score1);

    if (relation === 'same') {
      delta = (testedScore * 1) + (oppScore * -1);
    }
    if (relation === 'higher') {
      delta = (testedScore * 3) + (oppScore * -0.5);
    }
  }

  return {
    fightIndex,
    player1: fight.player1,
    player2: fight.player2,
    score1: Number(fight.score1),
    score2: Number(fight.score2),
    opponentTier,
    testedTier,
    relation,
    outcome,
    delta,
    isValidation,
  };
}

function getNextTier(tier: string, direction: 'up' | 'down'): string {
  const idx = TIER_SCALE.indexOf(tier.toUpperCase());
  if (direction === 'up') return idx < TIER_SCALE.length - 1 ? TIER_SCALE[idx + 1] : tier;
  return idx > 0 ? TIER_SCALE[idx - 1] : tier;
}

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
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

  // ── Detect if submission is a high test ──────────────────────────────────
  const highTest = isHighTestEntry(fights, contestant, tester);

  // ── Detect if new tier is HT3+ ───────────────────────────────────────────
  const newTierRank = newTier ? getTierRank(newTier) : -1;
  const ht3Rank = getTierRank('HT3');
  const isHighTierUpdate = newTierRank >= ht3Rank;

  async function handleSubmitClick() {
    if (!contestant || !tester || !mode || !newTier) {
      setError('Please fill in all required fields.');
      return;
    }

    // Block HT3+ updates for non-ChosusQT
    if (isHighTierUpdate && tester !== 'ChosusQT') {
      setError('Only ChosusQT can submit HT3+ tier updates.');
      return;
    }

    setError(null);

    if (highTest) {
      // Fetch current coeff
      const coeffCol = MODE_TO_COEFF_COLUMN[mode.toLowerCase()];
      const { data: playerData } = await (supabase as any)
        .from('tiers')
        .select(coeffCol)
        .eq('username', contestant)
        .maybeSingle();

      const oldCumulativeCoeff: number = playerData?.[coeffCol] ?? 0;

      // Determine if fight[0] is a validation fight
      // Validation: fights.length >= 2 AND fight[0] opponent tier > tested tier
      const isMultiFight = fights.length >= 2;
      const fightResults: FightCoeffResult[] = fights.map((fight, i) => {
        const isValidation = isMultiFight && i === 0;
        return calcFightCoeff(fight, contestant, i, isValidation);
      }).filter(Boolean) as FightCoeffResult[];

      const sessionCoeff = fightResults.reduce((sum, r) => sum + (r.isValidation ? 0 : r.delta), 0);
      const newCumulativeCoeff = oldCumulativeCoeff + sessionCoeff;

      const willPromote = sessionCoeff >= 9;
      const willDemote = !willPromote && newCumulativeCoeff < -9;

      const promotionTier = newTier;
      const demotionTier = oldTier ? getNextTier(oldTier, 'down') : '';

      setConfirmationData({
        sessionCoeff,
        oldCumulativeCoeff,
        newCumulativeCoeff,
        fightResults,
        willPromote,
        willDemote,
        isHighTest: true,
        promotionTier,
        demotionTier,
      });
      setShowConfirmModal(true);
    } else {
      // Low test — submit directly
      await commitSubmit(null);
    }
  }

  async function commitSubmit(confirmation: ConfirmationData | null) {
    setSubmitting(true);
    setError(null);
    setShowConfirmModal(false);

    const testArray = fights.map(f => ({
      player1: f.player1, player2: f.player2,
      score1: Number(f.score1), score2: Number(f.score2),
      tier1: f.tier1, tier2: f.tier2,
    }));

    let finalTier = newTier;
    if (confirmation?.willDemote && confirmation.demotionTier) {
      finalTier = confirmation.demotionTier;
    }

    const { error: historyError } = await supabase.from('history' as any).insert({
      tester, tested: contestant, old_tier: oldTier, new_tier: finalTier, mode, test_array: testArray,
    } as any);

    if (historyError) {
      setError(historyError.message);
      setSubmitting(false);
      return;
    }

    const col = MODE_TO_COLUMN[mode.toLowerCase()];
    const coeffCol = MODE_TO_COEFF_COLUMN[mode.toLowerCase()];

    if (col) {
      const { data: existing } = await supabase
        .from('tiers' as any).select('username').eq('username', contestant).maybeSingle() as { data: { username: string } | null };

      const updatePayload: Record<string, unknown> = { [col]: finalTier.toLowerCase() };

      if (confirmation) {
        updatePayload[coeffCol] = (confirmation.willPromote || confirmation.willDemote)
          ? 0
          : confirmation.newCumulativeCoeff;
      }

      if (existing) {
        await (supabase as any).from('tiers').update(updatePayload).eq('username', contestant);
      } else {
        await (supabase as any).from('tiers').insert({ username: contestant, ...updatePayload });
      }

      // Update each opponent's coeff at 25% of the fight's delta (inverse)
      if (confirmation) {
        for (const fight of confirmation.fightResults) {
          if (fight.isValidation || fight.delta === 0) continue;

          const opponentName = fight.player1 === contestant ? fight.player2 : fight.player1;
          const opponentTier = fight.opponentTier;

          if (TIER_SCALE.indexOf(opponentTier.toUpperCase()) < TIER_SCALE.indexOf('LT3')) continue;

          const { data: oppData } = await (supabase as any)
            .from('tiers').select(coeffCol).eq('username', opponentName).maybeSingle();

          if (oppData) {
            const penalty = -(fight.delta * 0.25);
            await (supabase as any)
              .from('tiers')
              .update({ [coeffCol]: (oppData[coeffCol] ?? 0) + penalty })
              .eq('username', opponentName);
          }
        }
      }
    }

    setSuccess(true);
    setSubmitting(false);
    setConfirmationData(null);
  }

  // ── Confirmation Modal ────────────────────────────────────────────────────

  function ConfirmationModal() {
    if (!confirmationData) return null;
    const { sessionCoeff, oldCumulativeCoeff, newCumulativeCoeff, fightResults, willPromote, willDemote, promotionTier, demotionTier } = confirmationData;

    const outcomeColor = willPromote ? '#4ade80' : willDemote ? '#ff5555' : '#ffcc55';
    const outcomeLabel = willPromote
      ? `PROMOTE → ${promotionTier}`
      : willDemote
      ? `DEMOTE → ${demotionTier}`
      : 'NO TIER CHANGE';

    const outcomeDescription = willPromote
      ? `Session coefficient ${sessionCoeff >= 0 ? '+' : ''}${sessionCoeff} reached the promotion threshold of ≥ 9.`
      : willDemote
      ? `Cumulative coefficient dropped to ${newCumulativeCoeff}, which is below the demotion threshold of −9.`
      : `Session coefficient ${sessionCoeff >= 0 ? '+' : ''}${sessionCoeff} did not reach ≥ 9. Cumulative updated to ${newCumulativeCoeff >= 0 ? '+' : ''}${newCumulativeCoeff}.`;

    return (
      <div
        onClick={() => setShowConfirmModal(false)}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.80)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: 540, maxWidth: '95%', maxHeight: '90vh',
            background: '#0d0d12',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
            color: '#fff',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Modal header */}
          <div style={{
            padding: '10px 16px',
            background: '#111118',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
              Confirm Tier Update
            </span>
            <button
              onClick={() => setShowConfirmModal(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 16, cursor: 'pointer', padding: 0, transition: 'color 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
            >✕</button>
          </div>

          <div style={{ padding: '16px', overflowY: 'auto', scrollbarWidth: 'none', flex: 1 }}>

            {/* Outcome banner */}
            <div style={{
              padding: '12px 14px',
              background: `${outcomeColor}0f`,
              border: `1px solid ${outcomeColor}30`,
              borderLeft: `3px solid ${outcomeColor}`,
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: outcomeColor, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                {outcomeLabel}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                {outcomeDescription}
              </div>
            </div>

            {/* Coeff summary */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14,
            }}>
              {[
                { label: 'Session Coeff', value: sessionCoeff, showSign: true },
                { label: 'Previous Cumul.', value: oldCumulativeCoeff, showSign: true },
                {
                  label: willPromote || willDemote ? 'New Cumul. (reset)' : 'New Cumul.',
                  value: willPromote || willDemote ? 0 : newCumulativeCoeff,
                  showSign: true,
                },
              ].map(item => {
                const color = item.value > 0 ? '#4ade80' : item.value < 0 ? '#ff5555' : 'rgba(255,255,255,0.4)';
                return (
                  <div key={item.label} style={{
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 6 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color, letterSpacing: '-0.02em' }}>
                      {item.showSign && item.value > 0 ? '+' : ''}{item.value}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fight breakdown */}
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
              Fight Breakdown
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
              {fightResults.map((r, i) => {
                const deltaColor = r.isValidation ? 'rgba(255,255,255,0.25)' : r.delta > 0 ? '#4ade80' : '#ff5555';
                const relationLabel = r.relation === 'same' ? 'Same' : r.relation === 'higher' ? 'Higher' : 'Lower';
                return (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '18px 1fr auto auto',
                    gap: 8, alignItems: 'center',
                    padding: '8px 10px',
                    background: r.isValidation ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderLeft: `2px solid ${r.isValidation ? 'rgba(255,255,255,0.1)' : r.outcome === 'win' ? '#4ade80' : '#ff5555'}`,
                    opacity: r.isValidation ? 0.6 : 1,
                  }}>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>#{r.fightIndex + 1}</span>
                    <div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                        {r.score1} – {r.score2}
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> vs </span>
                        <span style={{ color: getTierColor(r.opponentTier), fontWeight: 700 }}>{r.opponentTier}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>({relationLabel})</span>
                      </div>
                      {r.isValidation && (
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Validation fight — does not count
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: r.outcome === 'win' ? '#4ade80' : '#ff5555',
                    }}>
                      {r.outcome}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: deltaColor, minWidth: 36, textAlign: 'right' }}>
                      {r.isValidation ? '—' : (r.delta > 0 ? `+${r.delta}` : r.delta)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Confirm / cancel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: '10px', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)',
                  fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer', borderRadius: 0, transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              >
                Cancel
              </button>
              <button
                onClick={() => commitSubmit(confirmationData)}
                disabled={submitting}
                style={{
                  padding: '10px', border: 'none',
                  background: `linear-gradient(135deg, ${outcomeColor}cc, ${outcomeColor}88)`,
                  color: '#000', fontWeight: 800, fontSize: 11,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer', borderRadius: 0, transition: 'opacity 0.12s',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                Confirm & Submit
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showConfirmModal && <ConfirmationModal />}

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
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>Submit Tier Update</span>
          {highTest && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#ffcc55',
              background: 'rgba(255,204,85,0.1)',
              border: '1px solid rgba(255,204,85,0.25)',
              padding: '2px 8px',
            }}>
              High Test
            </span>
          )}
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
                cursor: 'pointer', transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,163,255,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(74,163,255,0.08)')}
              >
                + Add
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {fights.map((fight, i) => {
                const isValidationFight = fights.length >= 2 && i === 0;
                return (
                  <div key={i} style={{
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderLeft: isValidationFight
                      ? '2px solid rgba(255,255,255,0.15)'
                      : '2px solid rgba(74,163,255,0.3)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          Fight #{i + 1}
                        </span>
                        {isValidationFight && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '1px 6px', letterSpacing: '0.06em', textTransform: 'uppercase',
                          }}>Validation</span>
                        )}
                      </div>
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
                );
              })}
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
            onClick={handleSubmitClick}
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
    </>
  );
}