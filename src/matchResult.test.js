import { getResultFromScores } from './matchResult';

describe('single match', () => {
    test('clear winner', () => {
        expect(getResultFromScores({ score1: 11, score2: 7 }).winner).toBe(1);
        expect(getResultFromScores({ score1: 4, score2: 11 }).winner).toBe(2);
        expect(getResultFromScores({ score1: '11', score2: '0' }).winner).toBe(1);
    });
    test('missing scores are an error, including a half-entered score', () => {
        expect(getResultFromScores({ score1: '', score2: '' }).missing).toBe(true);
        expect(getResultFromScores({ score1: 11, score2: '' }).missing).toBe(true);
        expect(getResultFromScores({}).missing).toBe(true);
    });
    test('0 is a valid score, 0-0 is a tie', () => {
        expect(getResultFromScores({ score1: 0, score2: 11 }).winner).toBe(2);
        expect(getResultFromScores({ score1: 0, score2: 0 }).tied).toBe(true);
    });
    test('tie is an error', () => {
        const r = getResultFromScores({ score1: 9, score2: 9 });
        expect(r.tied).toBe(true);
        expect(r.winner).toBeUndefined();
    });
    test('no match', () => {
        expect(getResultFromScores(undefined).error).toBeTruthy();
    });
});

describe('best of 3', () => {
    const bo3 = (g) => ({ matchFormat: 'best_of_3', game1Score1: g[0], game1Score2: g[1], game2Score1: g[2], game2Score2: g[3], game3Score1: g[4] ?? '', game3Score2: g[5] ?? '' });
    test('2-0', () => {
        expect(getResultFromScores(bo3([11, 5, 11, 9])).winner).toBe(1);
        expect(getResultFromScores(bo3([5, 11, 9, 11])).winner).toBe(2);
    });
    test('1-1 needs game 3', () => {
        expect(getResultFromScores(bo3([11, 5, 9, 11])).missing).toBe(true);
        expect(getResultFromScores(bo3([11, 5, 9, 11, 11, 8])).winner).toBe(1);
        expect(getResultFromScores(bo3([11, 5, 9, 11, 8, 11])).winner).toBe(2);
    });
    test('missing or tied games are errors', () => {
        expect(getResultFromScores(bo3([11, 5, '', ''])).missing).toBe(true);
        expect(getResultFromScores(bo3([7, 7, 11, 2])).tied).toBe(true);
        expect(getResultFromScores(bo3([11, 5, 9, 11, 10, 10])).tied).toBe(true);
    });
});
