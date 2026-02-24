/**
 * kingOfCourtScheduler.js
 * Fully self-contained scheduler for King of Court (individual players + teamed doubles variant).
 * ISOLATION RULE: Only imports from shared.js. Never imports from other schedulers.
 * To apply a bug fix from here to another format, that must be a deliberate separate change.
 */

import { uid, avg, separatePlayersBySkill } from './shared';

/* ════════════════════════════════════════════════════════════
   SHARED INTERNAL HELPERS
   ════════════════════════════════════════════════════════════ */

/** Points awarded based on court position in the hierarchy */
const getCourtPoints = (courtIndexInHierarchy, courtsInHierarchy) =>
    (courtsInHierarchy - courtIndexInHierarchy) * 2;

/** Find the best balanced team-split for a group of 4 players */
const findBestTeamSplit = (group) => {
    const [p1, p2, p3, p4] = group;
    const splits = [
        { team1: [p1, p2], team2: [p3, p4] },
        { team1: [p1, p3], team2: [p2, p4] },
        { team1: [p1, p4], team2: [p2, p3] },
    ];
    return splits.reduce((best, split) => {
        const diff = Math.abs(avg(split.team1) - avg(split.team2));
        const bestDiff = Math.abs(avg(best.team1) - avg(best.team2));
        return diff < bestDiff ? split : best;
    });
};

/* ════════════════════════════════════════════════════════════
   INDIVIDUAL KOT — STATS
   ════════════════════════════════════════════════════════════ */

export const initializeKingOfCourtStats = (kotStats, presentPlayers) => {
    const updatedStats = { ...kotStats };
    presentPlayers.forEach(p => {
        if (!updatedStats[p.id]) {
            console.log(`NEW KOT PLAYER: ${p.name} - assigning to court`);
            updatedStats[p.id] = {
                player: p,
                totalPoints: 0,
                court1Wins: 0,
                currentCourt: null,
                courtHistory: [],
                roundsPlayed: 0,
                roundsSatOut: 0,
                lastPlayedRound: -1,
            };
        } else {
            updatedStats[p.id].player = p;
        }
    });
    return updatedStats;
};

export const updateKOTStats = (kotStats, match) => {
    if (match.status !== 'completed' || !match.winner) return;
    const winningTeam = match.winner === 'team1' ? match.team1 : match.team2;
    const points = match.pointsForWin || 0;
    winningTeam?.forEach(player => {
        if (kotStats[player.id]) {
            kotStats[player.id].totalPoints += points;
            if (match.courtLevel === 'KING') kotStats[player.id].court1Wins++;
        }
    });
};

/* ════════════════════════════════════════════════════════════
   INDIVIDUAL KOT — PLAYER SELECTION & ASSIGNMENT
   ════════════════════════════════════════════════════════════ */

const selectPlayersForKOTRound = (allPlayers, kotStats, maxPlayers, roundIdx) => {
    if (allPlayers.length <= maxPlayers) return [...allPlayers];

    console.log(`\n=== KOT PLAYER SELECTION (Round ${roundIdx + 1}) ===`);

    const playerPriority = allPlayers.map(p => {
        const stats = kotStats[p.id] || { roundsPlayed: 0, roundsSatOut: 0, lastPlayedRound: -1 };
        let priority = stats.roundsSatOut * 500;
        console.log(`${p.name}: sat out ${stats.roundsSatOut} rounds (+${stats.roundsSatOut * 500})`);

        if (stats.lastPlayedRound >= 0) {
            const roundsSince = roundIdx - stats.lastPlayedRound;
            priority += roundsSince * 200;
            if (roundsSince > 0) console.log(`  └─ ${roundsSince} rounds since last played (+${roundsSince * 200})`);
        } else {
            priority += 1000;
            console.log(`  └─ Never played (+1000)`);
        }

        const avgRoundsPlayed = roundIdx > 0
            ? Object.values(kotStats).reduce((sum, s) => sum + (s.roundsPlayed || 0), 0) / Object.keys(kotStats).length
            : 0;
        const catchup = (avgRoundsPlayed - stats.roundsPlayed) * 100;
        if (catchup > 0) { priority += catchup; console.log(`  └─ Catch-up factor (+${catchup.toFixed(0)})`); }

        priority += Math.random() * 1;
        console.log(`  TOTAL PRIORITY: ${priority.toFixed(2)}`);
        return { player: p, priority, stats };
    });

    const selected = playerPriority
        .sort((a, b) => b.priority - a.priority)
        .slice(0, maxPlayers)
        .map(item => item.player);
    console.log(`\nSelected top ${maxPlayers} players by priority`);
    return selected;
};

const assignPlayersToCourts = (groupPlayers, kotStats, previousRounds, roundIndex, numCourts, startingCourtIndex) => {
    if (previousRounds.length === 0) return groupPlayers;

    const lastRound = previousRounds[previousRounds.length - 1];
    const playerResults = [];

    groupPlayers.forEach(player => {
        let won = false;
        let lastCourt = null;
        lastRound.forEach(match => {
            if (match.status === 'completed') {
                const inTeam1 = match.team1?.some(p => p.id === player.id);
                const inTeam2 = match.team2?.some(p => p.id === player.id);
                if (inTeam1 || inTeam2) {
                    lastCourt = match.court;
                    if ((inTeam1 && match.winner === 'team1') || (inTeam2 && match.winner === 'team2')) won = true;
                }
            }
        });
        const stats = kotStats[player.id] || { totalPoints: 0, currentCourt: null };
        playerResults.push({ player, won, lastCourt: lastCourt || startingCourtIndex + numCourts - 1, totalPoints: stats.totalPoints || 0 });
    });

    playerResults.sort((a, b) => {
        if (a.lastCourt !== b.lastCourt) return a.lastCourt - b.lastCourt;
        if (a.won !== b.won) return a.won ? -1 : 1;
        return b.totalPoints - a.totalPoints;
    });

    const sortedPlayers = [];

    for (let courtIdx = 0; courtIdx < numCourts; courtIdx++) {
        const courtNumber = startingCourtIndex + courtIdx;
        const winnersFromThisCourt = playerResults.filter(pr => pr.lastCourt === courtNumber && pr.won).map(pr => pr.player);
        const winnersFromBelowCourt = courtIdx < numCourts - 1
            ? playerResults.filter(pr => pr.lastCourt === courtNumber + 1 && pr.won).map(pr => pr.player).slice(0, 2)
            : [];
        const losersFromThisCourt = playerResults.filter(pr => pr.lastCourt === courtNumber && !pr.won).map(pr => pr.player);
        const losersFromAboveCourt = courtIdx > 0
            ? playerResults.filter(pr => pr.lastCourt === courtNumber - 1 && !pr.won).map(pr => pr.player).slice(0, 2)
            : [];

        let courtPlayers = [];
        const addIfNotAssigned = (players) => {
            players.forEach(p => {
                if (!sortedPlayers.includes(p) && !courtPlayers.includes(p)) courtPlayers.push(p);
            });
        };

        addIfNotAssigned(winnersFromThisCourt);
        if (courtIdx > 0) addIfNotAssigned(losersFromAboveCourt);
        if (courtIdx < numCourts - 1) addIfNotAssigned(winnersFromBelowCourt);
        addIfNotAssigned(losersFromThisCourt);

        if (courtPlayers.length < 4) {
            const available = playerResults
                .filter(pr => !sortedPlayers.includes(pr.player) && !courtPlayers.includes(pr.player))
                .map(pr => pr.player);
            while (courtPlayers.length < 4 && available.length > 0) courtPlayers.push(available.shift());
        }

        sortedPlayers.push(...courtPlayers.slice(0, 4));
    }

    const remaining = groupPlayers.filter(p => !sortedPlayers.includes(p));
    sortedPlayers.push(...remaining);
    return sortedPlayers;
};

/* ════════════════════════════════════════════════════════════
   INDIVIDUAL KOT — MATCH GENERATION
   ════════════════════════════════════════════════════════════ */

const generateKOTMatchesForGroup = (groupPlayers, kotStats, numCourts, startingCourtIndex, roundIndex, previousRounds, groupLabel, courtsInHierarchy) => {
    const matches = [];
    const actualCourts = Math.min(numCourts, Math.floor(groupPlayers.length / 4));
    const maxPlayersThisRound = actualCourts * 4;
    console.log(`${groupLabel}: courtsInHierarchy=${courtsInHierarchy}, actualCourts=${actualCourts}`);

    let playersToAssign = [...groupPlayers];
    if (groupPlayers.length > maxPlayersThisRound) {
        console.log(`${groupLabel}: Selecting ${maxPlayersThisRound} of ${groupPlayers.length} players using priority system`);
        playersToAssign = selectPlayersForKOTRound(groupPlayers, kotStats, maxPlayersThisRound, roundIndex);
        console.log(`${groupLabel} - Playing: ${playersToAssign.map(p => p.name).join(', ')}`);
        console.log(`${groupLabel} - Sitting out: ${groupPlayers.filter(p => !playersToAssign.includes(p)).map(p => p.name).join(', ')}`);
    }

    let playerPool = [...playersToAssign];
    if (roundIndex === 0) {
        console.log(`First KOT round for ${groupLabel} - random assignment`);
        playerPool = playerPool.sort(() => Math.random() - 0.5);
    } else {
        console.log(`KOT advancement for ${groupLabel} - sorting by previous round results`);
        playerPool = assignPlayersToCourts(playersToAssign, kotStats, previousRounds, roundIndex, actualCourts, startingCourtIndex);
    }

    for (let courtIdx = 0; courtIdx < actualCourts; courtIdx++) {
        const courtNumber = startingCourtIndex + courtIdx;
        const playersForCourt = playerPool.slice(courtIdx * 4, (courtIdx + 1) * 4);
        if (playersForCourt.length < 4) break;

        const teamSplit = findBestTeamSplit(playersForCourt);
        playersForCourt.forEach(p => {
            if (kotStats[p.id]) {
                kotStats[p.id].currentCourt = courtNumber;
                kotStats[p.id].courtHistory.push(courtNumber);
                kotStats[p.id].roundsPlayed++;
                kotStats[p.id].lastPlayedRound = roundIndex;
            }
        });

        const courtPoints = getCourtPoints(courtIdx, courtsInHierarchy);
        console.log(`  Court ${courtNumber} (index ${courtIdx} in hierarchy): ${courtPoints} pts/win`);

        matches.push({
            id: uid(),
            court: courtNumber,
            courtLevel: courtIdx === 0 ? 'KING' : `Level ${courtIdx + 1}`,
            team1: teamSplit.team1,
            team2: teamSplit.team2,
            diff: Math.abs(avg(teamSplit.team1) - avg(teamSplit.team2)),
            score1: '', score2: '',
            game1Score1: '', game1Score2: '',
            game2Score1: '', game2Score2: '',
            game3Score1: '', game3Score2: '',
            status: 'pending',
            winner: null,
            skillLevel: groupLabel,
            pointsForWin: courtPoints,
            gameFormat: 'doubles',
            matchFormat: 'single_match',
        });
    }

    // Mark sitting-out players
    groupPlayers.filter(p => !playersToAssign.includes(p)).forEach(p => {
        if (kotStats[p.id]) kotStats[p.id].roundsSatOut++;
    });

    return matches;
};

/* ════════════════════════════════════════════════════════════
   PUBLIC API — INDIVIDUAL KOT
   ════════════════════════════════════════════════════════════ */

export const generateKingOfCourtRound = (presentPlayers, courts, kotStats, currentRoundIndex, previousRounds, separateBySkill) => {
    console.log(`\n=== [KOT SCHEDULER] GENERATING INDIVIDUAL ROUND ${currentRoundIndex + 1} ===`);

    const updatedStats = initializeKingOfCourtStats(kotStats, presentPlayers);
    const matches = [];

    if (separateBySkill && presentPlayers.length >= 8) {
        const { groups: skillGroups } = separatePlayersBySkill(presentPlayers, courts);
        let globalCourtIndex = 1;
        let allLeftovers = [];

        skillGroups.forEach(skillGroup => {
            const groupCourts = Math.floor(skillGroup.players.length / 4);
            const availableCourts = courts - globalCourtIndex + 1;
            const actualCourts = Math.min(groupCourts, availableCourts);

            if (actualCourts > 0) {
                console.log(`\n${skillGroup.label}: ${skillGroup.players.length} players, ${actualCourts} courts (starting at Court ${globalCourtIndex})`);
                const groupMatches = generateKOTMatchesForGroup(skillGroup.players, updatedStats, actualCourts, globalCourtIndex, currentRoundIndex, previousRounds, skillGroup.label, actualCourts);
                matches.push(...groupMatches);
                globalCourtIndex += groupMatches.length;

                const playedIds = new Set();
                groupMatches.forEach(m => {
                    if (m.player1) playedIds.add(m.player1.id);
                    if (m.player2) playedIds.add(m.player2.id);
                    m.team1?.forEach(p => playedIds.add(p.id));
                    m.team2?.forEach(p => playedIds.add(p.id));
                });
                skillGroup.players.forEach(p => { if (!playedIds.has(p.id)) allLeftovers.push(p); });
            } else {
                allLeftovers.push(...skillGroup.players);
            }
        });

        const remainingCourts = courts - (globalCourtIndex - 1);
        if (remainingCourts > 0 && allLeftovers.length >= 4) {
            const overflowCourts = Math.min(Math.floor(allLeftovers.length / 4), remainingCourts);
            if (overflowCourts > 0) {
                const overflowMatches = generateKOTMatchesForGroup(allLeftovers, updatedStats, overflowCourts, globalCourtIndex, currentRoundIndex, previousRounds, 'Mixed (Overflow)', overflowCourts);
                matches.push(...overflowMatches);
            }
        }
    } else {
        const groupMatches = generateKOTMatchesForGroup(presentPlayers, updatedStats, courts, 1, currentRoundIndex, previousRounds, 'Mixed', courts);
        matches.push(...groupMatches);
    }

    Object.assign(kotStats, updatedStats);

    console.log(`\n=== KOT ROUND ${currentRoundIndex + 1} SUMMARY ===`);
    console.log(`Courts used: ${matches.length}, Players playing: ${matches.length * 4}`);

    return matches;
};

/* ════════════════════════════════════════════════════════════
   KOT TEAMED DOUBLES — STATS
   ════════════════════════════════════════════════════════════ */

export const initializeKingOfCourtTeamStats = (kotTeamStats, presentTeams) => {
    const updatedStats = { ...kotTeamStats };
    presentTeams.forEach(team => {
        if (!updatedStats[team.id]) {
            console.log(`NEW KOT TEAM: ${team.player1.name}/${team.player2.name} - assigning to court`);
            updatedStats[team.id] = {
                team,
                totalPoints: 0,
                court1Wins: 0,
                currentCourt: null,
                courtHistory: [],
                roundsPlayed: 0,
                roundsSatOut: 0,
                lastPlayedRound: -1,
            };
        } else {
            updatedStats[team.id].team = team;
        }
    });
    return updatedStats;
};

export const updateKOTTeamStats = (kotTeamStats, match) => {
    if (match.status !== 'completed' || !match.winner) return;
    const winningTeamId = match.winner === 'team1' ? match.team1Id : match.team2Id;
    const points = match.pointsForWin || 0;
    if (kotTeamStats[winningTeamId]) {
        kotTeamStats[winningTeamId].totalPoints += points;
        if (match.courtLevel === 'KING') kotTeamStats[winningTeamId].court1Wins++;
    }
};

/* ════════════════════════════════════════════════════════════
   KOT TEAMED DOUBLES — TEAM SELECTION & ASSIGNMENT
   ════════════════════════════════════════════════════════════ */

const selectTeamsForKOTRound = (allTeams, kotTeamStats, maxTeams, roundIdx) => {
    if (allTeams.length <= maxTeams) return [...allTeams];

    console.log(`\n=== KOT TEAM SELECTION (Round ${roundIdx + 1}) ===`);

    const teamPriority = allTeams.map(team => {
        const stats = kotTeamStats[team.id] || { roundsPlayed: 0, roundsSatOut: 0, lastPlayedRound: -1 };
        let priority = stats.roundsSatOut * 500;
        console.log(`${team.player1.name}/${team.player2.name}: sat out ${stats.roundsSatOut} rounds (+${stats.roundsSatOut * 500})`);
        const roundsSincePlay = roundIdx - stats.lastPlayedRound;
        priority += roundsSincePlay * 100;
        console.log(`  → ${roundsSincePlay} rounds since play (+${roundsSincePlay * 100})`);
        priority += (100 - stats.roundsPlayed) * 10;
        console.log(`  → ${stats.roundsPlayed} rounds played (+${(100 - stats.roundsPlayed) * 10})`);
        console.log(`  → TOTAL PRIORITY: ${priority}`);
        return { team, priority };
    });

    teamPriority.sort((a, b) => b.priority - a.priority);
    const selectedTeams = teamPriority.slice(0, maxTeams).map(tp => tp.team);
    console.log(`Selected teams: ${selectedTeams.map(t => `${t.player1.name}/${t.player2.name}`).join(', ')}`);
    return selectedTeams;
};

const assignTeamsToCourts = (groupTeams, kotTeamStats, previousRounds, roundIndex, numCourts, startingCourtIndex) => {
    if (previousRounds.length === 0) return groupTeams;

    const lastRound = previousRounds[previousRounds.length - 1];
    const teamResults = [];

    groupTeams.forEach(team => {
        let won = false;
        let lastCourt = null;
        lastRound.forEach(match => {
            if (match.status === 'completed') {
                const isTeam1 = match.team1Id === team.id;
                const isTeam2 = match.team2Id === team.id;
                if (isTeam1 || isTeam2) {
                    lastCourt = match.court;
                    if ((isTeam1 && match.winner === 'team1') || (isTeam2 && match.winner === 'team2')) won = true;
                }
            }
        });
        const stats = kotTeamStats[team.id] || { totalPoints: 0, currentCourt: null };
        teamResults.push({ team, won, lastCourt: lastCourt || startingCourtIndex + numCourts - 1, totalPoints: stats.totalPoints || 0 });
    });

    teamResults.sort((a, b) => {
        if (a.lastCourt !== b.lastCourt) return a.lastCourt - b.lastCourt;
        if (a.won !== b.won) return a.won ? -1 : 1;
        return b.totalPoints - a.totalPoints;
    });

    const sortedTeams = [];

    for (let courtIdx = 0; courtIdx < numCourts; courtIdx++) {
        const courtNumber = startingCourtIndex + courtIdx;
        let courtTeams = [];
        const addTeamsIfNotAssigned = (teamsToAdd) => {
            teamsToAdd.forEach(team => {
                const isAlreadySorted = sortedTeams.some(t => t.id === team.id);
                const isInCurrentBatch = courtTeams.some(t => t.id === team.id);
                if (!isAlreadySorted && !isInCurrentBatch) courtTeams.push(team);
            });
        };

        const winnersFromThisCourt = teamResults.filter(tr => tr.lastCourt === courtNumber && tr.won).map(tr => tr.team);
        const winnersFromBelowCourt = courtIdx < numCourts - 1 ? teamResults.filter(tr => tr.lastCourt === courtNumber + 1 && tr.won).map(tr => tr.team).slice(0, 1) : [];
        const losersFromAboveCourt = courtIdx > 0 ? teamResults.filter(tr => tr.lastCourt === courtNumber - 1 && !tr.won).map(tr => tr.team).slice(0, 1) : [];
        const losersFromThisCourt = teamResults.filter(tr => tr.lastCourt === courtNumber && !tr.won).map(tr => tr.team);

        addTeamsIfNotAssigned(winnersFromThisCourt);
        if (courtIdx > 0) addTeamsIfNotAssigned(losersFromAboveCourt);
        if (courtIdx < numCourts - 1) addTeamsIfNotAssigned(winnersFromBelowCourt);
        addTeamsIfNotAssigned(losersFromThisCourt);

        if (courtTeams.length < 2) {
            const available = teamResults
                .filter(tr => !sortedTeams.some(t => t.id === tr.team.id) && !courtTeams.some(t => t.id === tr.team.id))
                .map(tr => tr.team);
            while (courtTeams.length < 2 && available.length > 0) courtTeams.push(available.shift());
        }

        courtTeams.slice(0, 2).forEach(team => sortedTeams.push(team));
    }

    const remaining = groupTeams.filter(t => !sortedTeams.some(st => st.id === t.id));
    sortedTeams.push(...remaining);
    return sortedTeams;
};

/* ════════════════════════════════════════════════════════════
   KOT TEAMED DOUBLES — MATCH GENERATION
   ════════════════════════════════════════════════════════════ */

const generateKOTMatchesForTeamGroup = (groupTeams, kotTeamStats, numCourts, startingCourtIndex, roundIndex, previousRounds, groupLabel, courtsInHierarchy) => {
    const matches = [];
    const actualCourts = Math.min(numCourts, Math.floor(groupTeams.length / 2));
    const maxTeamsThisRound = actualCourts * 2;
    console.log(`${groupLabel}: courtsInHierarchy=${courtsInHierarchy}, actualCourts=${actualCourts}`);

    let teamsToAssign = [...groupTeams];
    if (groupTeams.length > maxTeamsThisRound) {
        console.log(`${groupLabel}: Selecting ${maxTeamsThisRound} of ${groupTeams.length} teams using priority system`);
        teamsToAssign = selectTeamsForKOTRound(groupTeams, kotTeamStats, maxTeamsThisRound, roundIndex);
        console.log(`${groupLabel} - Playing: ${teamsToAssign.map(t => `${t.player1.name}/${t.player2.name}`).join(', ')}`);
        console.log(`${groupLabel} - Sitting out: ${groupTeams.filter(t => !teamsToAssign.includes(t)).map(t => `${t.player1.name}/${t.player2.name}`).join(', ')}`);
    }

    let teamPool = [...teamsToAssign];
    if (roundIndex === 0) {
        console.log(`First KOT round for ${groupLabel} - random assignment`);
        teamPool = teamPool.sort(() => Math.random() - 0.5);
    } else {
        console.log(`KOT advancement for ${groupLabel} - sorting by previous round results`);
        teamPool = assignTeamsToCourts(teamsToAssign, kotTeamStats, previousRounds, roundIndex, actualCourts, startingCourtIndex);
    }

    for (let courtIdx = 0; courtIdx < actualCourts; courtIdx++) {
        const courtNumber = startingCourtIndex + courtIdx;
        const teamsForCourt = teamPool.slice(courtIdx * 2, (courtIdx + 1) * 2);
        if (teamsForCourt.length < 2) break;

        teamsForCourt.forEach(team => {
            if (kotTeamStats[team.id]) {
                kotTeamStats[team.id].currentCourt = courtNumber;
                kotTeamStats[team.id].courtHistory.push(courtNumber);
                kotTeamStats[team.id].roundsPlayed++;
                kotTeamStats[team.id].lastPlayedRound = roundIndex;
            }
        });

        const courtPoints = getCourtPoints(courtIdx, courtsInHierarchy);
        console.log(`  Court ${courtNumber} (index ${courtIdx} in hierarchy): ${courtPoints} pts/win`);

        matches.push({
            id: uid(),
            court: courtNumber,
            courtLevel: courtIdx === 0 ? 'KING' : `Level ${courtIdx + 1}`,
            team1: [teamsForCourt[0].player1, teamsForCourt[0].player2],
            team2: [teamsForCourt[1].player1, teamsForCourt[1].player2],
            team1Id: teamsForCourt[0].id,
            team2Id: teamsForCourt[1].id,
            teamGender: teamsForCourt[0].gender,
            diff: Math.abs(teamsForCourt[0].avgRating - teamsForCourt[1].avgRating),
            score1: '', score2: '',
            game1Score1: '', game1Score2: '',
            game2Score1: '', game2Score2: '',
            game3Score1: '', game3Score2: '',
            status: 'pending',
            winner: null,
            gameFormat: 'teamed_doubles',
            matchFormat: 'single_match',
            pointsForWin: courtPoints,
            startTime: new Date().toISOString(),
        });
    }

    // Mark sitting-out teams
    groupTeams.filter(t => !teamsToAssign.includes(t)).forEach(team => {
        if (kotTeamStats[team.id]) kotTeamStats[team.id].roundsSatOut++;
    });

    return matches;
};

/* ════════════════════════════════════════════════════════════
   PUBLIC API — KOT TEAMED DOUBLES
   ════════════════════════════════════════════════════════════ */

export const generateKingOfCourtTeamedRound = (presentTeams, courts, kotTeamStats, currentRoundIndex, previousRounds, separateBySkill) => {
    console.log(`\n=== [KOT SCHEDULER] GENERATING TEAMED ROUND ${currentRoundIndex + 1} ===`);

    const updatedStats = initializeKingOfCourtTeamStats(kotTeamStats, presentTeams);
    const matches = [];

    if (separateBySkill && presentTeams.length >= 4) {
        const groups = [
            { teams: presentTeams.filter(t => t.gender === 'male_male'), label: 'Male/Male' },
            { teams: presentTeams.filter(t => t.gender === 'female_female'), label: 'Female/Female' },
            { teams: presentTeams.filter(t => t.gender === 'mixed'), label: 'Mixed' },
        ];

        let globalCourtIndex = 1;
        groups.forEach(({ teams, label }) => {
            if (teams.length >= 2) {
                const groupCourts = Math.floor(teams.length / 2);
                const actualCourts = Math.min(groupCourts, courts - globalCourtIndex + 1);
                if (actualCourts > 0) {
                    console.log(`\n${label}: ${teams.length} teams, ${actualCourts} courts (starting at Court ${globalCourtIndex})`);
                    const groupMatches = generateKOTMatchesForTeamGroup(teams, updatedStats, actualCourts, globalCourtIndex, currentRoundIndex, previousRounds, label, actualCourts);
                    matches.push(...groupMatches);
                    globalCourtIndex += groupMatches.length;
                }
            }
        });
    } else {
        const groupMatches = generateKOTMatchesForTeamGroup(presentTeams, updatedStats, courts, 1, currentRoundIndex, previousRounds, 'All Teams', courts);
        matches.push(...groupMatches);
    }

    Object.assign(kotTeamStats, updatedStats);

    console.log(`\n=== KOT TEAMED ROUND ${currentRoundIndex + 1} SUMMARY ===`);
    console.log(`Courts used: ${matches.length}, Teams playing: ${matches.length * 2}`);

    return matches;
};

/* ════════════════════════════════════════════════════════════
   PUBLIC API — AUTO TEAM GENERATION
   ════════════════════════════════════════════════════════════ */

export const generateBalancedKOTTeams = (players) => {
    if (players.length < 2) return [];

    const sortedPlayers = [...players].sort((a, b) => Number(b.rating) - Number(a.rating));
    const numTeams = Math.floor(players.length / 2);
    const teamSlots = Array(numTeams).fill(null).map(() => ({ player1: null, player2: null }));

    let currentTeam = 0;
    let direction = 1;

    for (let i = 0; i < sortedPlayers.length; i++) {
        const player = sortedPlayers[i];
        if (teamSlots[currentTeam].player1 === null) teamSlots[currentTeam].player1 = player;
        else if (teamSlots[currentTeam].player2 === null) teamSlots[currentTeam].player2 = player;

        if (direction === 1) {
            currentTeam++;
            if (currentTeam >= numTeams) { currentTeam = numTeams - 1; direction = -1; }
        } else {
            currentTeam--;
            if (currentTeam < 0) { currentTeam = 0; direction = 1; }
        }
    }

    const teams = [];
    teamSlots.forEach(slot => {
        if (slot.player1 && slot.player2) {
            const p1Rating = Number(slot.player1.rating);
            const p2Rating = Number(slot.player2.rating);
            let gender = 'mixed';
            if (slot.player1.gender === 'male' && slot.player2.gender === 'male') gender = 'male_male';
            if (slot.player1.gender === 'female' && slot.player2.gender === 'female') gender = 'female_female';
            teams.push({ id: uid(), player1: slot.player1, player2: slot.player2, avgRating: (p1Rating + p2Rating) / 2, gender, isAutoGenerated: true });
        }
    });

    return teams;
};
