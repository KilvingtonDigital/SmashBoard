/**
 * singlesScheduler.js
 * Fully self-contained scheduler for Round Robin Singles.
 * ISOLATION RULE: Only imports from shared.js. Never imports from other schedulers.
 * To apply a bug fix from here to another format, that must be a deliberate separate change.
 *
 * NOTE: opponents is stored as a plain object { [id]: count }, NOT a Map.
 * Maps silently become {} through JSON.stringify/parse (localStorage / session restore),
 * causing .get() to crash. Plain objects are JSON-safe.
 */

import { uid, SKILL_LEVELS, getPlayerSkillLevel } from './shared';

/* ── Internal: initialise a fresh stat entry per player ── */
const initializePlayerStats = (playerStats, presentPlayers) => {
    const updatedStats = { ...playerStats };
    presentPlayers.forEach(p => {
        if (!updatedStats[p.id]) {
            updatedStats[p.id] = {
                player: p,
                roundsPlayed: 0,
                roundsSatOut: 0,
                lastPlayedRound: -1,
                opponents: {},   // plain object — survives JSON round-trips
            };
        } else {
            updatedStats[p.id].player = p;
            // Defensive: coerce any legacy Maps that might have snuck in via old saved state
            if (!updatedStats[p.id].opponents || updatedStats[p.id].opponents instanceof Map) {
                updatedStats[p.id].opponents = {};
            }
        }
    });
    return updatedStats;
};

/* ── Internal: select which players play this round (priority = most sat-out first) ── */
const selectPlayersForRound = (allPlayers, playerStats, maxPlayers, roundIdx) => {
    if (allPlayers.length <= maxPlayers) return [...allPlayers];

    const playerPriority = allPlayers.map(p => {
        const stats = playerStats[p.id] || { roundsPlayed: 0, roundsSatOut: 0, lastPlayedRound: -1 };
        let priority = stats.roundsSatOut * 500;

        if (stats.lastPlayedRound >= 0) {
            priority += (roundIdx - stats.lastPlayedRound) * 200;
        } else {
            priority += 1000; // never played yet — highest priority
        }

        const avgRoundsPlayed = roundIdx > 0
            ? Object.values(playerStats).reduce((sum, s) => sum + (s.roundsPlayed || 0), 0) / Object.keys(playerStats).length
            : 0;
        priority += (avgRoundsPlayed - stats.roundsPlayed) * 100;
        priority += Math.random() * 1;

        return { player: p, priority, stats };
    });

    const sorted = playerPriority.sort((a, b) => b.priority - a.priority);
    const selected = sorted.slice(0, maxPlayers);
    const sittingOut = sorted.slice(maxPlayers);

    console.log(`[Singles selectPlayers] Selecting ${maxPlayers} of ${allPlayers.length} players (round ${roundIdx}):`);
    selected.forEach(({ player, priority, stats }) =>
        console.log(`  ✅ PLAYING  ${player.name.padEnd(20)} priority=${priority.toFixed(1)} satOut=${stats.roundsSatOut} played=${stats.roundsPlayed} lastRound=${stats.lastPlayedRound}`)
    );
    sittingOut.forEach(({ player, priority, stats }) =>
        console.log(`  💤 SITTING  ${player.name.padEnd(20)} priority=${priority.toFixed(1)} satOut=${stats.roundsSatOut} played=${stats.roundsPlayed} lastRound=${stats.lastPlayedRound}`)
    );

    return selected.map(item => item.player);
};

/* ── Internal: update stats after the round is locked in ── */
const updatePlayerStatsForSinglesRound = (playerStats, presentPlayers, matches, roundIdx) => {
    const playingIds = new Set();
    matches.forEach(match => {
        playingIds.add(match.player1.id);
        playingIds.add(match.player2.id);
    });

    presentPlayers.forEach(player => {
        const stats = playerStats[player.id];
        if (playingIds.has(player.id)) {
            stats.roundsPlayed++;
            stats.lastPlayedRound = roundIdx;
        } else {
            stats.roundsSatOut++;
        }
    });

    // Track opponents
    matches.forEach(match => {
        const { player1, player2 } = match;
        if (!playerStats[player1.id].opponents) playerStats[player1.id].opponents = {};
        if (!playerStats[player2.id].opponents) playerStats[player2.id].opponents = {};
        playerStats[player1.id].opponents[player2.id] = (playerStats[player1.id].opponents[player2.id] || 0) + 1;
        playerStats[player2.id].opponents[player1.id] = (playerStats[player2.id].opponents[player1.id] || 0) + 1;
    });
};

/* ══════════════════════════════════════════════════════════
   PUBLIC API
   ══════════════════════════════════════════════════════════ */

/**
 * generateSinglesRound
 * Selects players fairly (most sat-out first), pairs same-gender opponents
 * by closest rating, and returns an array of match objects.
 */
export const generateSinglesRound = (presentPlayers, courts, playerStats, currentRoundIndex, matchFormat = 'single_match') => {
    console.log(`\n=== [SINGLES SCHEDULER] GENERATING ROUND ${currentRoundIndex + 1} ===`);
    console.log(`Present players: ${presentPlayers.length}, Courts: ${courts}`);

    if (typeof matchFormat === 'undefined') {
        throw new Error('Match format is not defined. Please select a valid match format in Setup.');
    }

    const updatedStats = initializePlayerStats(playerStats, presentPlayers);
    const maxPlayersPerRound = courts * 2; // 2 singles players per court

    const playersThisRound = selectPlayersForRound(presentPlayers, updatedStats, maxPlayersPerRound, currentRoundIndex);

    const matches = [];
    const usedPlayers = new Set();

    for (let courtIdx = 0; courtIdx < courts; courtIdx++) {
        const remaining = playersThisRound.filter(p => !usedPlayers.has(p.id));
        if (remaining.length < 2) break;

        const player1 = remaining[0];
        const sameGender = remaining.slice(1).filter(p => p.gender === player1.gender);

        if (sameGender.length === 0) {
            usedPlayers.add(player1.id); // skip — no same-gender partner; they'll sit
            courtIdx--;
            continue;
        }

        const bestOpponent = sameGender.reduce((best, p) =>
            Math.abs(p.rating - player1.rating) < Math.abs(best.rating - player1.rating) ? p : best
        );

        usedPlayers.add(player1.id);
        usedPlayers.add(bestOpponent.id);

        matches.push({
            id: uid(),
            court: courtIdx + 1,
            player1,
            player2: bestOpponent,
            diff: Math.abs(player1.rating - bestOpponent.rating),
            score1: '', score2: '',
            game1Score1: '', game1Score2: '',
            game2Score1: '', game2Score2: '',
            game3Score1: '', game3Score2: '',
            status: 'pending',
            winner: null,
            gameFormat: 'singles',
            matchFormat,
        });
    }

    updatePlayerStatsForSinglesRound(updatedStats, presentPlayers, matches, currentRoundIndex);
    Object.assign(playerStats, updatedStats);

    console.log(`=== [SINGLES SCHEDULER] ROUND ${currentRoundIndex + 1} SUMMARY ===`);
    console.log(`Courts used: ${matches.length}, Players playing: ${matches.length * 2}, Players sitting: ${presentPlayers.length - matches.length * 2}`);

    return matches;
};
