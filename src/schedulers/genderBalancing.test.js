import { findBestTeamSplit } from './doublesScheduler';

describe('Gender Matchup Balance in Team Splitting', () => {
    test('findBestTeamSplit never creates Female-Female vs Male-Male matchup when 2 females & 2 males are present', () => {
        const group = [
            { id: 'p1', name: 'Alice (F)', gender: 'female', rating: 4.0 },
            { id: 'p2', name: 'Beth (F)', gender: 'female', rating: 3.5 },
            { id: 'p3', name: 'Charlie (M)', gender: 'male', rating: 4.0 },
            { id: 'p4', name: 'David (M)', gender: 'male', rating: 3.5 }
        ];

        const playerStats = {};
        const split = findBestTeamSplit(group, playerStats, false);

        // Calculate females per team
        const team1Females = split.team1.filter(p => p.gender === 'female').length;
        const team2Females = split.team2.filter(p => p.gender === 'female').length;

        // Verify neither team is 2 females vs 0 females
        expect(team1Females).toBe(1);
        expect(team2Females).toBe(1);
    });

    test('findBestTeamSplit creates Mixed vs Mixed when ratings would otherwise favor FF vs MM', () => {
        // Here Alice(F)+Beth(F) = 7.5 avg 3.75, Charlie(M)+David(M) = 7.5 avg 3.75 (0.0 diff)
        // Mixed option A: Alice(4.0)+David(3.5) = 7.5 avg 3.75, Beth(3.5)+Charlie(4.0) = 7.5 avg 3.75
        const group = [
            { id: 'f1', name: 'Female 1', gender: 'female', rating: 4.0 },
            { id: 'f2', name: 'Female 2', gender: 'female', rating: 3.5 },
            { id: 'm1', name: 'Male 1', gender: 'male', rating: 4.0 },
            { id: 'm2', name: 'Male 2', gender: 'male', rating: 3.5 }
        ];

        const split = findBestTeamSplit(group, {}, false);

        const team1HasFemale = split.team1.some(p => p.gender === 'female');
        const team1HasMale = split.team1.some(p => p.gender === 'male');
        const team2HasFemale = split.team2.some(p => p.gender === 'female');
        const team2HasMale = split.team2.some(p => p.gender === 'male');

        expect(team1HasFemale && team1HasMale).toBe(true);
        expect(team2HasFemale && team2HasMale).toBe(true);
    });
});
