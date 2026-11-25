/**
 * ratingLock.js
 * Hard rating lock for DUPR sessions.
 *
 * Splits the roster into two pools at a rating threshold (default 3.5):
 *   - upper pool: rating >= threshold
 *   - lower pool: rating <  threshold
 * and guarantees that no match ever contains players from both pools.
 *
 * This is deliberately different from the "Separate by skill levels" option, which is a
 * soft preference: it bumps small groups into neighbouring levels, fills spare courts with
 * a mixed overflow match and lets the fairness sweep swap players across levels.
 * With the lock on, a pool that cannot fill a court sits out instead of borrowing players.
 *
 * ISOLATION RULE: pure functions only. Imports nothing from the schedulers — the caller
 * passes in the scheduler to run for each pool.
 */

export const DEFAULT_RATING_LOCK_THRESHOLD = 3.5;

const UPPER = 'upper';
const LOWER = 'lower';

/** Coerce a threshold from user input / saved state into a usable number. */
export const normalizeRatingLockThreshold = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_RATING_LOCK_THRESHOLD;
    return n;
};

/** Which pool a rating belongs to. A rating exactly at the threshold is in the upper pool. */
export const ratingLockPoolOf = (rating, threshold = DEFAULT_RATING_LOCK_THRESHOLD) =>
    Number(rating) >= normalizeRatingLockThreshold(threshold) ? UPPER : LOWER;

/** Display label for a pool, e.g. "3.5+" / "Under 3.5". */
export const ratingLockLabel = (poolKey, threshold = DEFAULT_RATING_LOCK_THRESHOLD) => {
    const t = normalizeRatingLockThreshold(threshold);
    const text = Number.isInteger(t * 10) ? t.toFixed(1) : String(t);
    return poolKey === UPPER ? `${text}+` : `Under ${text}`;
};

/** Split players into the two locked pools. Always returns [upper, lower]. */
export const splitPlayersByRatingLock = (players, threshold = DEFAULT_RATING_LOCK_THRESHOLD) => {
    const pools = [
        { key: UPPER, label: ratingLockLabel(UPPER, threshold), players: [] },
        { key: LOWER, label: ratingLockLabel(LOWER, threshold), players: [] },
    ];
    (players || []).forEach(p => {
        pools[ratingLockPoolOf(p.rating, threshold) === UPPER ? 0 : 1].players.push(p);
    });
    return pools;
};

/**
 * Decide how many courts each pool gets this round.
 *
 * Goal: over a session, players in every pool get as close as possible to the same number
 * of games. A pool never gets more courts than it can fill
 * (floor(players / playersPerCourt)); spare courts stay empty rather than mixing pools.
 *
 * Courts are handed out one at a time to the pool that would have the lowest
 * games-per-player after receiving it, counting what each pool was given in earlier rounds.
 * So when the courts do not divide evenly, the odd court alternates between pools instead
 * of always going to the same one, and with a single court the pools take turns.
 *
 * Stateless: earlier rounds are replayed from the same inputs, so the result for a given
 * round is deterministic.
 *
 * @param {number[]} poolSizes       player count per pool
 * @param {number}   courts          total courts available
 * @param {number}   playersPerCourt 4 for doubles, 2 for singles
 * @param {number}   roundIndex      0-based round number
 * @returns {number[]} courts per pool, same order as poolSizes
 */
export const allocateCourtsToPools = (poolSizes, courts, playersPerCourt, roundIndex = 0) => {
    const total = Math.max(0, Math.floor(Number(courts) || 0));
    const capacity = poolSizes.map(n => Math.floor(n / playersPerCourt));
    const eligible = capacity.map((c, i) => (c > 0 ? i : -1)).filter(i => i >= 0);
    let alloc = poolSizes.map(() => 0);
    if (total === 0 || eligible.length === 0) return alloc;

    const lastRound = Math.max(0, Math.floor(Number(roundIndex) || 0));
    const given = poolSizes.map(() => 0); // player-slots handed to each pool in earlier rounds
    const EPS = 1e-9;

    for (let round = 0; round <= lastRound; round++) {
        alloc = poolSizes.map(() => 0);
        for (let c = 0; c < total; c++) {
            let best = -1;
            eligible.forEach(i => {
                if (alloc[i] >= capacity[i]) return;
                if (best === -1) { best = i; return; }
                const after = (k) => (given[k] + (alloc[k] + 1) * playersPerCourt) / poolSizes[k];
                const before = (k) => (given[k] + alloc[k] * playersPerCourt) / poolSizes[k];
                if (after(i) < after(best) - EPS) best = i;
                else if (Math.abs(after(i) - after(best)) <= EPS && before(i) < before(best) - EPS) best = i;
            });
            if (best === -1) break; // every pool is at capacity; spare courts stay empty
            alloc[best]++;
        }
        alloc.forEach((a, i) => { given[i] += a * playersPerCourt; });
    }

    return alloc;
};

/**
 * Generate one round with the rating lock applied.
 *
 * `generate(poolPlayers, poolCourts, pool)` must return that pool's matches with courts
 * numbered from 1. This wrapper renumbers courts so the pools sit side by side
 * (upper pool on the lowest court numbers) and tags each match with its pool.
 */
export const generateRatingLockedRound = ({
    players, courts, threshold = DEFAULT_RATING_LOCK_THRESHOLD,
    playersPerCourt = 4, roundIndex = 0, generate,
}) => {
    const pools = splitPlayersByRatingLock(players, threshold);
    const alloc = allocateCourtsToPools(pools.map(p => p.players.length), courts, playersPerCourt, roundIndex);

    const matches = [];
    let courtOffset = 0;

    pools.forEach((pool, idx) => {
        const poolCourts = alloc[idx];
        console.log(`[Rating Lock] ${pool.label}: ${pool.players.length} players, ${poolCourts} court(s)`);
        if (poolCourts === 0) return;

        const poolMatches = (generate(pool.players, poolCourts, pool) || []).slice(0, poolCourts);
        poolMatches.forEach((m, i) => {
            matches.push({ ...m, court: courtOffset + i + 1, skillLevel: pool.label, ratingLockPool: pool.key });
        });
        courtOffset += poolMatches.length;
    });

    return matches;
};

/**
 * Court-by-court assignment: from a priority-sorted bench, return the candidates that may
 * share a court with the highest-priority player. If that player's pool cannot field
 * `needed` players, fall through to the next pool that can. Returns null when no single
 * pool can fill the court — the caller must NOT mix pools in that case.
 */
export const pickRatingLockedCandidates = (sortedAvailable, threshold, needed) => {
    const seen = [];
    for (const p of sortedAvailable || []) {
        const key = ratingLockPoolOf(p.rating, threshold);
        if (seen.includes(key)) continue;
        seen.push(key);
        const pool = sortedAvailable.filter(q => ratingLockPoolOf(q.rating, threshold) === key);
        if (pool.length >= needed) return { key, label: ratingLockLabel(key, threshold), players: pool };
    }
    return null;
};

/** Every player in a match, for doubles or singles match objects. */
export const playersInMatch = (match) => [
    ...(match.team1 || []), ...(match.team2 || []),
    ...(match.player1 ? [match.player1] : []), ...(match.player2 ? [match.player2] : []),
];

/** True when a match contains players from both pools. Used by tests and runtime guard. */
export const matchCrossesRatingLock = (match, threshold = DEFAULT_RATING_LOCK_THRESHOLD) =>
    new Set(playersInMatch(match).map(p => ratingLockPoolOf(p.rating, threshold))).size > 1;
