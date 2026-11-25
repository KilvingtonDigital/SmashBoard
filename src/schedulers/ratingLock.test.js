import {
    ratingLockPoolOf, ratingLockLabel, splitPlayersByRatingLock, allocateCourtsToPools,
    generateRatingLockedRound, pickRatingLockedCandidates, matchCrossesRatingLock, playersInMatch,
} from './ratingLock';
import { generateRoundRobinRound } from './doublesScheduler';
import { generateSinglesRound } from './singlesScheduler';

const mk = (id, rating, gender = 'male') => ({ id: `p${id}`, name: `P${id}`, rating, gender, present: true });

// A typical open-play roster: ratings straddle 3.5, mixed genders.
const roster = (ratings) => ratings.map((r, i) => mk(i + 1, r, i % 3 === 0 ? 'female' : 'male'));

beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('pool membership', () => {
    test('a player exactly at the threshold is in the upper pool', () => {
        expect(ratingLockPoolOf(3.5, 3.5)).toBe('upper');
        expect(ratingLockPoolOf(3.49, 3.5)).toBe('lower');
        expect(ratingLockPoolOf(5.5, 3.5)).toBe('upper');
        expect(ratingLockPoolOf(2.0, 3.5)).toBe('lower');
        expect(ratingLockPoolOf('3.5', 3.5)).toBe('upper');
    });

    test('labels', () => {
        expect(ratingLockLabel('upper', 3.5)).toBe('3.5+');
        expect(ratingLockLabel('lower', 3.5)).toBe('Under 3.5');
        expect(ratingLockLabel('upper', 4)).toBe('4.0+');
    });

    test('split keeps every player in exactly one pool', () => {
        const players = roster([2.5, 3.0, 3.4, 3.5, 3.6, 4.0, 4.5, 3.49]);
        const [upper, lower] = splitPlayersByRatingLock(players, 3.5);
        expect(upper.players.map(p => p.rating).sort()).toEqual([3.5, 3.6, 4.0, 4.5]);
        expect(lower.players.map(p => p.rating).sort()).toEqual([2.5, 3.0, 3.4, 3.49]);
    });
});

describe('court allocation', () => {
    const session = (sizes, courts, rounds, ppc = 4) => {
        const slots = sizes.map(() => 0);
        const perRound = [];
        for (let r = 0; r < rounds; r++) {
            const a = allocateCourtsToPools(sizes, courts, ppc, r);
            perRound.push(a);
            a.forEach((n, i) => { slots[i] += n * ppc; });
        }
        return { perRound, gamesPerPlayer: slots.map((s, i) => (sizes[i] ? s / sizes[i] : 0)) };
    };

    test('even split uses every court every round', () => {
        expect(allocateCourtsToPools([8, 8], 4, 4)).toEqual([2, 2]);
        expect(allocateCourtsToPools([8, 9], 4, 4, 5)).toEqual([2, 2]);
    });

    test('a pool never gets a court it cannot fill', () => {
        expect(allocateCourtsToPools([9, 3], 4, 4)).toEqual([2, 0]);
        expect(allocateCourtsToPools([3, 3], 4, 4)).toEqual([0, 0]);
        expect(allocateCourtsToPools([10, 6], 4, 4)).toEqual([2, 1]);
    });

    test('the odd court alternates instead of always going to the same pool', () => {
        const { perRound, gamesPerPlayer } = session([8, 9], 3, 8);
        expect(perRound.some(a => a[0] === 2)).toBe(true);
        expect(perRound.some(a => a[1] === 2)).toBe(true);
        expect(Math.abs(gamesPerPlayer[0] - gamesPerPlayer[1])).toBeLessThanOrEqual(1);
    });

    test('one court, two pools: they take turns', () => {
        const { perRound } = session([8, 8], 1, 4);
        expect(perRound.map(a => a[0])).not.toEqual([1, 1, 1, 1]);
        expect(perRound.map(a => a[0]).reduce((x, y) => x + y)).toBe(2);
    });

    test('games per player stay close across pools whenever courts are the limit', () => {
        [[4, 13], [5, 12], [8, 9], [9, 8], [12, 5], [13, 4], [12, 12], [16, 8]].forEach(sizes => {
            [1, 2, 3].forEach(courts => {
                const { gamesPerPlayer } = session(sizes, courts, 12);
                // within one court's worth of games for the smaller pool
                const tolerance = 4 / Math.min(...sizes);
                expect(Math.abs(gamesPerPlayer[0] - gamesPerPlayer[1])).toBeLessThanOrEqual(tolerance + 1e-9);
            });
        });
    });

    test('never allocates more than the courts available or a pool can fill', () => {
        for (let courts = 0; courts <= 8; courts++) {
            for (let r = 0; r < 6; r++) {
                const a = allocateCourtsToPools([14, 9], courts, 4, r);
                expect(a[0] + a[1]).toBeLessThanOrEqual(courts);
                expect(a[0]).toBeLessThanOrEqual(3);
                expect(a[1]).toBeLessThanOrEqual(2);
            }
        }
    });
});

describe('doubles: no match ever mixes pools', () => {
    const rosters = {
        'even split, 16 players': [2.5, 2.8, 3.0, 3.0, 3.2, 3.3, 3.4, 3.49, 3.5, 3.5, 3.6, 3.8, 4.0, 4.2, 4.5, 5.0],
        'awkward sizes 7 low / 10 high': [2.5, 3.0, 3.1, 3.2, 3.3, 3.4, 3.4, 3.5, 3.5, 3.6, 3.7, 3.8, 4.0, 4.0, 4.2, 4.5, 5.0],
        'everyone bunched at the line': [3.3, 3.4, 3.4, 3.4, 3.45, 3.49, 3.5, 3.5, 3.5, 3.55, 3.6, 3.6],
        'low pool too small to play': [3.0, 3.2, 3.4, 3.5, 3.6, 3.8, 4.0, 4.1, 4.3, 4.5, 4.8],
    };

    Object.entries(rosters).forEach(([name, ratings]) => {
        [2, 3, 4, 6].forEach(courts => {
            test(`${name} on ${courts} courts, 12 rounds x 25 runs`, () => {
                for (let run = 0; run < 25; run++) {
                    const players = roster(ratings);
                    const stats = {};
                    const rounds = [];
                    for (let r = 0; r < 12; r++) {
                        const round = generateRatingLockedRound({
                            players, courts, threshold: 3.5, playersPerCourt: 4, roundIndex: r,
                            generate: (pp, pc) => generateRoundRobinRound(pp, pc, stats, r, false, 'single_match', true, 2, rounds),
                        });

                        // 1. the lock holds
                        round.forEach(m => expect(matchCrossesRatingLock(m, 3.5)).toBe(false));
                        // 2. every match is a full doubles match
                        round.forEach(m => expect(playersInMatch(m)).toHaveLength(4));
                        // 3. nobody is on two courts, courts are unique and within range
                        const ids = round.flatMap(m => playersInMatch(m).map(p => p.id));
                        expect(new Set(ids).size).toBe(ids.length);
                        const courtNums = round.map(m => m.court);
                        expect(new Set(courtNums).size).toBe(courtNums.length);
                        courtNums.forEach(c => { expect(c).toBeGreaterThanOrEqual(1); expect(c).toBeLessThanOrEqual(courts); });
                        // 4. each match is labelled with its pool
                        round.forEach(m => expect(['3.5+', 'Under 3.5']).toContain(m.skillLevel));

                        rounds.push(round.map(m => ({ ...m, status: 'completed' })));
                    }
                }
            });
        });
    });

    test('for contrast: the existing "separate by skill" option DOES mix across 3.5', () => {
        // Documents the behaviour this fix replaces. Not a guarantee of the old code — just evidence.
        const ratings = [2.5, 3.0, 3.1, 3.2, 3.3, 3.4, 3.4, 3.5, 3.5, 3.6, 3.7, 3.8, 4.0, 4.0, 4.2, 4.5, 5.0];
        let crossed = 0;
        for (let run = 0; run < 25; run++) {
            const players = roster(ratings);
            const stats = {};
            const rounds = [];
            for (let r = 0; r < 12; r++) {
                const round = generateRoundRobinRound(players, 4, stats, r, true, 'single_match', true, 2, rounds);
                crossed += round.filter(m => matchCrossesRatingLock(m, 3.5)).length;
                rounds.push(round.map(m => ({ ...m, status: 'completed' })));
            }
        }
        expect(crossed).toBeGreaterThan(0);
    });

    test('everyone in a playable pool gets court time and sit-outs are shared', () => {
        const players = roster([3.0, 3.1, 3.2, 3.3, 3.4, 3.4, 3.5, 3.5, 3.6, 3.7, 3.8, 4.0, 4.0, 4.2]); // 6 low, 8 high
        const stats = {};
        const rounds = [];
        const played = {};
        for (let r = 0; r < 12; r++) {
            const round = generateRatingLockedRound({
                players, courts: 3, threshold: 3.5, playersPerCourt: 4, roundIndex: r,
                generate: (pp, pc) => generateRoundRobinRound(pp, pc, stats, r, false, 'single_match', false, 2, rounds),
            });
            round.forEach(m => playersInMatch(m).forEach(p => { played[p.id] = (played[p.id] || 0) + 1; }));
            rounds.push(round);
        }
        const low = players.filter(p => p.rating < 3.5).map(p => played[p.id] || 0);
        const high = players.filter(p => p.rating >= 3.5).map(p => played[p.id] || 0);
        expect(Math.min(...high)).toBe(12);                         // 8 players, 2 courts: all play every round
        expect(Math.min(...low)).toBeGreaterThanOrEqual(6);         // 6 players, 1 court: 4 of 6 each round
        expect(Math.max(...low) - Math.min(...low)).toBeLessThanOrEqual(2);
    });
});

describe('singles: no match ever mixes pools', () => {
    test('12 rounds x 25 runs', () => {
        for (let run = 0; run < 25; run++) {
            const players = [3.0, 3.2, 3.4, 3.49, 3.5, 3.6, 4.0, 4.5, 3.3, 3.9].map((r, i) => mk(i + 1, r, 'male'));
            const stats = {};
            for (let r = 0; r < 12; r++) {
                const round = generateRatingLockedRound({
                    players, courts: 4, threshold: 3.5, playersPerCourt: 2, roundIndex: r,
                    generate: (pp, pc) => generateSinglesRound(pp, pc, stats, r, 'single_match'),
                });
                expect(round.length).toBeGreaterThan(0);
                round.forEach(m => expect(matchCrossesRatingLock(m, 3.5)).toBe(false));
                const ids = round.flatMap(m => playersInMatch(m).map(p => p.id));
                expect(new Set(ids).size).toBe(ids.length);
            }
        }
    });
});

describe('court-by-court assignment', () => {
    test('uses the top-priority player\'s pool when it can fill the court', () => {
        const bench = [mk(1, 3.2), mk(2, 4.0), mk(3, 3.0), mk(4, 3.4), mk(5, 3.1), mk(6, 4.5)];
        const pick = pickRatingLockedCandidates(bench, 3.5, 4);
        expect(pick.key).toBe('lower');
        expect(pick.players.every(p => p.rating < 3.5)).toBe(true);
    });
    test('falls through to the other pool rather than mixing', () => {
        const bench = [mk(1, 3.2), mk(2, 4.0), mk(3, 3.6), mk(4, 3.5), mk(5, 4.5), mk(6, 3.0)];
        const pick = pickRatingLockedCandidates(bench, 3.5, 4);
        expect(pick.key).toBe('upper');
        expect(pick.players).toHaveLength(4);
    });
    test('returns null when no single pool can fill the court', () => {
        const bench = [mk(1, 3.2), mk(2, 4.0), mk(3, 3.6), mk(4, 3.0), mk(5, 3.1)];
        expect(pickRatingLockedCandidates(bench, 3.5, 4)).toBeNull();
    });
});
