import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Score entry bottom-sheet modal.
 * Rendered into document.body via createPortal to escape any CSS stacking context.
 *
 * Props:
 *  scoreSheet   – { courtNumber } | null
 *  courtStates  – array of court objects
 *  rounds       – array of round arrays
 *  updateScore  – (rIdx, mIdx, field, value) => void
 *  quickWin     – (rIdx, mIdx, side) => void
 *  completeCourtMatch – (courtNumber) => void
 *  setCourtStates – setter
 *  onClose      – () => void
 */
export default function ScoreModal({
    scoreSheet,
    courtStates,
    rounds,
    updateScore,
    quickWin,
    completeCourtMatch,
    setCourtStates,
    onRemove,
    onClose,
}) {
    if (!scoreSheet) return null;

    const sc = courtStates.find(c => c.courtNumber === scoreSheet.courtNumber);
    if (!sc) return null;
    const cm = sc.currentMatch;
    if (!cm) return null;

    // Find live match in rounds (scores are live there; cm may be stale)
    let rIdx = -1, mIdx = -1;
    for (let r = rounds.length - 1; r >= 0; r--) {
        for (let mi = 0; mi < rounds[r].length; mi++) {
            const m = rounds[r][mi];
            if (cm.id && m.id && m.id === cm.id) { rIdx = r; mIdx = mi; break; }
        }
        if (rIdx >= 0) break;
    }
    // Fallback: match by player composition (handles restored-session id drift)
    if (rIdx < 0) {
        const cmPlayers = [
            ...(cm.team1 || [cm.player1, cm.player2].filter(Boolean)),
            ...(cm.team2 || [cm.player3, cm.player4].filter(Boolean)),
        ].sort().join('|');
        for (let r = rounds.length - 1; r >= 0; r--) {
            for (let mi = 0; mi < rounds[r].length; mi++) {
                const m = rounds[r][mi];
                const mPlayers = [
                    ...(m.team1 || [m.player1, m.player2].filter(Boolean)),
                    ...(m.team2 || [m.player3, m.player4].filter(Boolean)),
                ].sort().join('|');
                if (mPlayers === cmPlayers) { rIdx = r; mIdx = mi; break; }
            }
            if (rIdx >= 0) break;
        }
    }

    const liveMatch = rIdx >= 0 ? rounds[rIdx][mIdx] : cm;
    const isTeamed = !!(liveMatch.team1 && liveMatch.team2);
    const isBo3 = liveMatch.matchFormat === 'best_of_3';

    const getName = p => (p && typeof p === 'object') ? (p.name || 'Player') : (p || 'Player');
    const team1Label = isTeamed
        ? (liveMatch.team1 || []).map(getName).join(' & ')
        : [liveMatch.player1, liveMatch.player2].filter(Boolean).map(getName).join(' & ') || 'Team 1';
    const team2Label = isTeamed
        ? (liveMatch.team2 || []).map(getName).join(' & ')
        : [liveMatch.player3, liveMatch.player4].filter(Boolean).map(getName).join(' & ') || 'Team 2';

    const handleSave = () => {
        if (rIdx >= 0) completeCourtMatch(scoreSheet.courtNumber);
        onClose();
    };

    const handleRemoveCourt = () => {
        const confirmed = window.confirm(
            `Remove this match from Court ${scoreSheet.courtNumber} with no score?\n\n` +
            `The teams will return to the bench. This cannot be undone automatically — ` +
            `use "Undo Last" to restore it if needed.`
        );
        if (!confirmed) return;

        // Stamp the match as 'removed' in rounds so Undo can find it
        if (rIdx >= 0) {
            const removedMatch = {
                ...liveMatch,
                status: 'removed',
                winner: null,
                score1: '', score2: '',
                endTime: new Date().toISOString(),
            };
            // We need to update rounds via the prop — use a ref trick via a custom event
            // Instead, pass an updateScore-style callback; for now stamp via the rounds setter
            // This is handled by the parent via onRemove prop (add below)
        }

        setCourtStates(prev => prev.map(c =>
            c.courtNumber === scoreSheet.courtNumber
                ? { ...c, status: 'ready', currentMatch: null }
                : c
        ));
        // Notify parent to stamp the match as removed in rounds
        if (onRemove) onRemove(rIdx, mIdx);
        onClose();
    };

    const modal = (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{ width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 16px 32px' }}>

                {/* Handle bar */}
                <div style={{ width: 40, height: 4, background: '#ddd', borderRadius: 99, margin: '0 auto 16px' }} />

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e1e2e', margin: 0 }}>
                        Court {scoreSheet.courtNumber} — Score Entry
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>✕</button>
                </div>

                {/* Teams */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e1e2e', textAlign: 'center', background: '#f0f4ff', borderRadius: 12, padding: '8px 4px' }}>{team1Label}</div>
                    <div style={{ fontWeight: 700, color: '#888', fontSize: 13 }}>vs</div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e1e2e', textAlign: 'center', background: '#fff4e5', borderRadius: 12, padding: '8px 4px' }}>{team2Label}</div>
                </div>

                {/* Score inputs */}
                {isBo3 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                        {[
                            { label: 'Game 1', f1: 'game1Score1', f2: 'game1Score2' },
                            { label: 'Game 2', f1: 'game2Score1', f2: 'game2Score2' },
                            { label: 'Game 3', f1: 'game3Score1', f2: 'game3Score2' },
                        ].map(({ label, f1, f2 }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 56, fontSize: 12, color: '#888', flexShrink: 0 }}>{label}:</span>
                                <input
                                    type="number" min={0}
                                    value={liveMatch[f1] === '' ? '' : (liveMatch[f1] ?? '')}
                                    onChange={e => rIdx >= 0 && updateScore(rIdx, mIdx, f1, e.target.value)}
                                    style={{ width: 60, height: 40, border: '1.5px solid #ddd', borderRadius: 10, textAlign: 'center', fontSize: 16, fontWeight: 700 }}
                                />
                                <span style={{ fontWeight: 700, color: '#bbb' }}>–</span>
                                <input
                                    type="number" min={0}
                                    value={liveMatch[f2] === '' ? '' : (liveMatch[f2] ?? '')}
                                    onChange={e => rIdx >= 0 && updateScore(rIdx, mIdx, f2, e.target.value)}
                                    style={{ width: 60, height: 40, border: '1.5px solid #ddd', borderRadius: 10, textAlign: 'center', fontSize: 16, fontWeight: 700 }}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
                        <input
                            type="number" min={0}
                            value={liveMatch.score1 === '' ? '' : (liveMatch.score1 ?? '')}
                            onChange={e => rIdx >= 0 && updateScore(rIdx, mIdx, 'score1', e.target.value)}
                            style={{ width: 80, height: 56, border: '2px solid #ddd', borderRadius: 14, textAlign: 'center', fontSize: 26, fontWeight: 800 }}
                        />
                        <span style={{ fontSize: 22, fontWeight: 700, color: '#bbb' }}>–</span>
                        <input
                            type="number" min={0}
                            value={liveMatch.score2 === '' ? '' : (liveMatch.score2 ?? '')}
                            onChange={e => rIdx >= 0 && updateScore(rIdx, mIdx, 'score2', e.target.value)}
                            style={{ width: 80, height: 56, border: '2px solid #ddd', borderRadius: 14, textAlign: 'center', fontSize: 26, fontWeight: 800 }}
                        />
                    </div>
                )}

                {/* Quick Win buttons — score-aware */}
                {rIdx >= 0 && (() => {
                    // Determine who is currently leading from the live score
                    const s1 = Number(liveMatch.score1);
                    const s2 = Number(liveMatch.score2);
                    const hasScores = liveMatch.score1 !== '' && liveMatch.score2 !== '' &&
                        !isNaN(s1) && !isNaN(s2) && (s1 > 0 || s2 > 0);
                    const team1Winning = hasScores && s1 > s2;
                    const team2Winning = hasScores && s2 > s1;

                    const btnBase = { padding: '10px 8px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', lineHeight: 1.3, transition: 'opacity 0.15s' };
                    const btn1Style = {
                        ...btnBase,
                        background: team1Winning ? '#22c55e' : team2Winning ? '#f1f5f9' : '#e8f0fe',
                        color: team1Winning ? '#fff' : team2Winning ? '#94a3b8' : '#1a3a8f',
                        opacity: team2Winning ? 0.55 : 1,
                    };
                    const btn2Style = {
                        ...btnBase,
                        background: team2Winning ? '#22c55e' : team1Winning ? '#f1f5f9' : '#fff3e0',
                        color: team2Winning ? '#fff' : team1Winning ? '#94a3b8' : '#b45309',
                        opacity: team1Winning ? 0.55 : 1,
                    };

                    return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                            <button onClick={() => quickWin(rIdx, mIdx, 1)} style={btn1Style}>
                                {team1Winning ? '🏆 ' : ''}{team1Label} win
                            </button>
                            <button onClick={() => quickWin(rIdx, mIdx, 2)} style={btn2Style}>
                                {team2Winning ? '🏆 ' : ''}{team2Label} win
                            </button>
                        </div>
                    );
                })()}


                {/* Complete button */}
                <button
                    onClick={handleSave}
                    style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', background: '#1e1e2e', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', marginBottom: 8 }}
                >
                    ✓ Save &amp; Complete Match
                </button>

                {/* Remove from court */}
                <button
                    onClick={handleRemoveCourt}
                    style={{ width: '100%', height: 40, borderRadius: 12, border: '1.5px solid #eee', background: 'transparent', color: '#999', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                    Remove from court (no score)
                </button>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
