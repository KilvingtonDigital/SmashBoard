/**
 * matchResult.js
 * Works out a match result from the scores typed in, without changing anything.
 * Used to check a result BEFORE a match is completed or a court is cleared, so a bad
 * tap can never close a match or free a court on its own.
 *
 * Returns { winner: 1 | 2 } when the scores give a clear result,
 * or { error: 'message for the director' } when they do not.
 * The rules and messages mirror the checks inside quickWin.
 */

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

export const getResultFromScores = (m) => {
    if (!m) return { error: 'Match not found.' };

    if (m.matchFormat === 'best_of_3') {
        const g1s1 = num(m.game1Score1), g1s2 = num(m.game1Score2);
        const g2s1 = num(m.game2Score1), g2s2 = num(m.game2Score2);
        if (g1s1 === null || g1s2 === null || g2s1 === null || g2s2 === null) {
            return { error: 'Please enter scores for Game 1 and Game 2 before selecting a winner.', missing: true };
        }
        if ([g1s1, g1s2, g2s1, g2s2].some(Number.isNaN)) return { error: 'Scores must be numbers.' };

        let team1Games = 0, team2Games = 0;
        if (g1s1 > g1s2) team1Games++; else if (g1s2 > g1s1) team2Games++;
        else return { error: 'Game 1 cannot be tied. Please enter valid scores.', tied: true };
        if (g2s1 > g2s2) team1Games++; else if (g2s2 > g2s1) team2Games++;
        else return { error: 'Game 2 cannot be tied. Please enter valid scores.', tied: true };

        if (team1Games === 2 || team2Games === 2) {
            return { winner: team1Games === 2 ? 1 : 2, games: [team1Games, team2Games] };
        }

        const g3s1 = Number(m.game3Score1), g3s2 = Number(m.game3Score2);
        if (!g3s1 || !g3s2) {
            return { error: 'Match is tied 1-1. Please enter Game 3 scores before selecting a winner.', missing: true };
        }
        if (g3s1 === g3s2) return { error: 'Game 3 cannot be tied. Please enter valid scores.', tied: true };
        if (g3s1 > g3s2) team1Games++; else team2Games++;
        return { winner: team1Games > team2Games ? 1 : 2, games: [team1Games, team2Games] };
    }

    const s1 = num(m.score1), s2 = num(m.score2);
    if (s1 === null || s2 === null) return { error: 'Please enter scores before selecting a winner.', missing: true };
    if (Number.isNaN(s1) || Number.isNaN(s2)) return { error: 'Scores must be numbers.' };
    if (s1 === s2) return { error: 'Scores cannot be tied. Please enter valid scores.', tied: true, score: [s1, s2] };
    return { winner: s1 > s2 ? 1 : 2, score: [s1, s2] };
};
