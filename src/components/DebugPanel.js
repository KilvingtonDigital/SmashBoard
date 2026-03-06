/**
 * DebugPanel.js
 * Dev-only diagnostic overlay. Only renders when NODE_ENV === 'development'.
 * Import and use <DebugPanel log={debugLog} /> anywhere in the app.
 *
 * Usage:
 *   const [debugLog, addDebugLog] = useDebugLog();
 *   // then call addDebugLog('tag', 'message', optionalData) anywhere
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';

const IS_DEV = process.env.NODE_ENV === 'development';

// ── Hook: call this once in PickleballTournamentManager ──────────────────────
export function useDebugLog() {
    const [log, setLog] = useState([]);

    const add = useCallback((tag, message, data) => {
        if (!IS_DEV) return;
        const entry = {
            id: Date.now() + Math.random(),
            time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            tag,
            message,
            data: data !== undefined ? JSON.stringify(data, null, 2) : null,
        };
        console.log(`[DEBUG][${tag}] ${message}`, data !== undefined ? data : '');
        setLog(prev => [entry, ...prev].slice(0, 200)); // cap at 200 entries
    }, []);

    return [log, add];
}

// ── Tag colour map ────────────────────────────────────────────────────────────
const TAG_COLORS = {
    PLAYERS: '#3b82f6',     // blue
    PRESENT: '#8b5cf6',     // purple
    SESSION: '#f59e0b',    // amber
    ROUND: '#10b981',    // green
    COURT: '#06b6d4',    // cyan
    WARN: '#ef4444',    // red
    INFO: '#6b7280',    // gray
};

// ── Panel Component ───────────────────────────────────────────────────────────
export default function DebugPanel({ log }) {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const bottomRef = useRef(null);

    // Don't render in production
    if (!IS_DEV) return null;

    const filtered = filter
        ? log.filter(e => e.tag.includes(filter.toUpperCase()) || e.message.toLowerCase().includes(filter.toLowerCase()))
        : log;

    return (
        <>
            {/* Toggle button */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    position: 'fixed', bottom: 80, right: 12, zIndex: 99998,
                    background: open ? '#1e293b' : '#3b82f6', color: '#fff',
                    border: 'none', borderRadius: 9999, padding: '6px 14px',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    fontFamily: 'monospace',
                }}
            >
                🐛 {open ? 'Hide' : 'Debug'} ({log.length})
            </button>

            {open && (
                <div style={{
                    position: 'fixed', bottom: 118, right: 12, zIndex: 99997,
                    width: 380, maxHeight: 480,
                    background: '#0f172a', color: '#e2e8f0',
                    borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    display: 'flex', flexDirection: 'column', fontFamily: 'monospace', fontSize: 11,
                    overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e293b', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontWeight: 700, color: '#60a5fa', flex: 1 }}>🐛 Debug Log</span>
                        <input
                            placeholder="filter…"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            style={{ background: '#1e293b', border: 'none', borderRadius: 6, color: '#e2e8f0', padding: '3px 8px', fontSize: 11, width: 100, outline: 'none' }}
                        />
                        <button onClick={() => { setExpandedId(null); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}>
                            clear expand
                        </button>
                    </div>

                    {/* Tag legend */}
                    <div style={{ padding: '4px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
                        {Object.entries(TAG_COLORS).map(([tag, color]) => (
                            <button key={tag} onClick={() => setFilter(f => f === tag ? '' : tag)}
                                style={{ background: filter === tag ? color : 'transparent', border: `1px solid ${color}`, color: filter === tag ? '#fff' : color, borderRadius: 4, padding: '1px 6px', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
                                {tag}
                            </button>
                        ))}
                    </div>

                    {/* Entries */}
                    <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
                        {filtered.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#475569', padding: 16 }}>No entries{filter ? ' matching filter' : ''}</div>
                        )}
                        {filtered.map(entry => {
                            const color = TAG_COLORS[entry.tag] || '#6b7280';
                            const expanded = expandedId === entry.id;
                            return (
                                <div key={entry.id}
                                    onClick={() => entry.data && setExpandedId(expanded ? null : entry.id)}
                                    style={{ padding: '3px 12px', borderBottom: '1px solid #1e293b22', cursor: entry.data ? 'pointer' : 'default', background: expanded ? '#1e293b' : 'transparent' }}>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                                        <span style={{ color: '#475569', flexShrink: 0 }}>{entry.time}</span>
                                        <span style={{ background: color, color: '#fff', borderRadius: 3, padding: '0 4px', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>{entry.tag}</span>
                                        <span style={{ color: '#cbd5e1', flex: 1, wordBreak: 'break-word' }}>{entry.message}</span>
                                        {entry.data && <span style={{ color: '#475569' }}>{expanded ? '▲' : '▼'}</span>}
                                    </div>
                                    {expanded && entry.data && (
                                        <pre style={{ margin: '4px 0 2px', padding: 8, background: '#020617', borderRadius: 6, color: '#7dd3fc', fontSize: 10, overflow: 'auto', maxHeight: 160 }}>
                                            {entry.data}
                                        </pre>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>
                </div>
            )}
        </>
    );
}
