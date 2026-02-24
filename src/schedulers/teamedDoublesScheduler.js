/**
 * teamedDoublesScheduler.js
 * Fully self-contained scheduler for Round Robin Teamed Doubles.
 * ISOLATION RULE: Only imports from shared.js. Never imports from other schedulers.
 * To apply a bug fix from here to another format, that must be a deliberate separate change.
 */

import { uid } from './shared';

/* ── Internal: select teams for this round (priority = most sat-out first) ── */
const selectTeamsForRound = (allTeams, teamStats, maxTeams, roundIdx) => {
    if (allTeams.length <= maxTeams) return [...allTeams];

    const teamPriority = allTeams.map(team => {
        const stats = teamStats[team.id] || { roundsPlayed: 0, roundsSatOut: 0, lastPlayedRound: -1 };
        let priority = stats.roundsSatOut * 500;

        if (stats.lastPlayedRound >= 0) {
            priority += (roundIdx - stats.lastPlayedRound) * 200;
        } else {
            priority += 1000; // never played
        }

        const avgRoundsPlayed = roundIdx > 0
            ? Object.values(teamStats).reduce((sum, s) => sum + (s.roundsPlayed || 0), 0) / Object.keys(teamStats).length
            : 0;
        priority += (avgRoundsPlayed - stats.roundsPlayed) * 100;
        priority += Math.random() * 1;

        return { team, priority, stats };
    });

    return teamPriority
        .sort((a, b) => b.priority - a.priority)
        .slice(0, maxTeams)
        .map(item => item.team);
};

/* ── Internal: update team stats after the round is locked in ── */
const updateTeamStatsForRound = (teamStats, allTeams, matches, roundIdx) => {
    const playingIds = new Set();
    matches.forEach(match => {
        playingIds.add(match.team1Id);
        playingIds.add(match.team2Id);
    });

    allTeams.forEach(team => {
        const stats = teamStats[team.id];
        if (playingIds.has(team.id)) {
            stats.roundsPlayed++;
            stats.lastPlayedRound = roundIdx;
        } else {
            stats.roundsSatOut++;
        }
    });

    // Track opponents
    matches.forEach(match => {
        teamStats[match.team1Id].opponents.set(
            match.team2Id,
            (teamStats[match.team1Id].opponents.get(match.team2Id) || 0) + 1
        );
        teamStats[match.team2Id].opponents.set(
            match.team1Id,
            (teamStats[match.team2Id].opponents.get(match.team1Id) || 0) + 1
        );
    });
};

/* ══════════════════════════════════════════════════════════
   PUBLIC API
   ══════════════════════════════════════════════════════════ */

/**
 * generateTeamedDoublesRound
 * Selects teams fairly (most sat-out first, within gender groups),
 * pairs teams by closest avg rating, and returns an array of match objects.
 */
export const generateTeamedDoublesRound = (teams, courts, teamStats, currentRoundIndex, matchFormat = 'single_match') => {
    console.log(`\n=== [TEAMED DOUBLES SCHEDULER] GENERATING ROUND ${currentRoundIndex + 1} ===`);
    console.log(`Total teams: ${teams.length}, Courts: ${courts}`);

    // Initialise stats for any new teams
    teams.forEach(team => {
        if (!teamStats[team.id]) {
            teamStats[team.id] = {
                roundsPlayed: 0,
                roundsSatOut: 0,
                lastPlayedRound: -1,
                opponents: new Map(),
            };
        } else if (!(teamStats[team.id].opponents instanceof Map)) {
            // JSON.stringify/parse converts Map → plain object {}. Coerce back.
            teamStats[team.id].opponents = new Map(Object.entries(teamStats[team.id].opponents || {}));
        }
    });

    // Gender groups
    const maleTeams = teams.filter(t => t.gender === 'male_male');
    const femaleTeams = teams.filter(t => t.gender === 'female_female');
    const mixedTeams = teams.filter(t => t.gender === 'mixed');
    console.log(`Male teams: ${maleTeams.length}, Female teams: ${femaleTeams.length}, Mixed teams: ${mixedTeams.length}`);

    const matches = [];
    const usedTeams = new Set();
    let courtIdx = 0;

    const createMatchesForGender = (genderTeams, genderLabel) => {
        if (genderTeams.length < 2) {
            console.log(`Not enough ${genderLabel} teams (need 2, have ${genderTeams.length})`);
            return;
        }

        const availableCourts = courts - courtIdx;
        const maxTeamsForGender = Math.min(genderTeams.length, availableCourts * 2);
        const selectedTeams = selectTeamsForRound(genderTeams, teamStats, maxTeamsForGender, currentRoundIndex);

        console.log(`${genderLabel} - Playing: ${selectedTeams.map(t => `${t.player1.name}/${t.player2.name}`).join(', ')}`);

        const remainingTeams = [...selectedTeams];

        while (remainingTeams.length >= 2 && courtIdx < courts) {
            let bestMatch = null;
            let smallestDiff = Infinity;

            for (let i = 0; i < remainingTeams.length - 1; i++) {
                for (let j = i + 1; j < remainingTeams.length; j++) {
                    const diff = Math.abs(remainingTeams[i].avgRating - remainingTeams[j].avgRating);
                    const playedBefore = teamStats[remainingTeams[i].id].opponents.get(remainingTeams[j].id) || 0;
                    const adjustedDiff = diff + playedBefore * 2;
                    if (adjustedDiff < smallestDiff) {
                        smallestDiff = adjustedDiff;
                        bestMatch = [remainingTeams[i], remainingTeams[j]];
                    }
                }
            }

            if (bestMatch) {
                usedTeams.add(bestMatch[0].id);
                usedTeams.add(bestMatch[1].id);

                matches.push({
                    id: uid(),
                    court: courtIdx + 1,
                    team1: [bestMatch[0].player1, bestMatch[0].player2],
                    team2: [bestMatch[1].player1, bestMatch[1].player2],
                    team1Id: bestMatch[0].id,
                    team2Id: bestMatch[1].id,
                    teamGender: bestMatch[0].gender,
                    diff: Math.abs(bestMatch[0].avgRating - bestMatch[1].avgRating),
                    score1: '', score2: '',
                    game1Score1: '', game1Score2: '',
                    game2Score1: '', game2Score2: '',
                    game3Score1: '', game3Score2: '',
                    status: 'pending',
                    winner: null,
                    gameFormat: 'teamed_doubles',
                    matchFormat: typeof matchFormat !== 'undefined' ? matchFormat : 'single_match',
                });

                remainingTeams.splice(remainingTeams.indexOf(bestMatch[0]), 1);
                remainingTeams.splice(remainingTeams.indexOf(bestMatch[1]), 1);
                courtIdx++;
            } else {
                break;
            }
        }
    };

    createMatchesForGender(maleTeams, 'Male/Male');
    createMatchesForGender(femaleTeams, 'Female/Female');
    createMatchesForGender(mixedTeams, 'Mixed');

    updateTeamStatsForRound(teamStats, teams, matches, currentRoundIndex);

    console.log(`=== [TEAMED DOUBLES SCHEDULER] ROUND ${currentRoundIndex + 1} SUMMARY ===`);
    console.log(`Courts used: ${matches.length}, Teams playing: ${matches.length * 2}, Teams sitting: ${teams.length - matches.length * 2}`);

    return matches;
};
