/**
 * shared.js
 * Pure, stateless utility functions shared across all schedulers.
 * Schedulers import ONLY from this file — never from each other.
 */

export const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const avg = (t) => (t[0].rating + t[1].rating) / 2;

export const SKILL_LEVELS = {
    BEGINNER: { min: 2.0, max: 2.9, label: 'Beginner', color: 'bg-red-100 text-red-700' },
    ADVANCED_BEGINNER: { min: 3.0, max: 3.4, label: 'Advanced Beginner', color: 'bg-orange-100 text-orange-700' },
    INTERMEDIATE: { min: 3.5, max: 3.9, label: 'Intermediate', color: 'bg-yellow-100 text-yellow-700' },
    ADVANCED_INTERMEDIATE: { min: 4.0, max: 4.4, label: 'Advanced Intermediate', color: 'bg-green-100 text-green-700' },
    ADVANCED: { min: 4.5, max: 4.9, label: 'Advanced', color: 'bg-blue-100 text-blue-700' },
    EXPERT: { min: 5.0, max: 5.4, label: 'Expert', color: 'bg-purple-100 text-purple-700' },
    EXPERT_PRO: { min: 5.5, max: 6.0, label: 'Expert Pro', color: 'bg-pink-100 text-pink-700' },
};

export const getPlayerSkillLevel = (rating) => {
    for (const [key, level] of Object.entries(SKILL_LEVELS)) {
        if (rating >= level.min && rating <= level.max) {
            return { key, ...level };
        }
    }
    return { key: 'BEGINNER', ...SKILL_LEVELS.BEGINNER };
};

export const canPlayTogether = (player1, player2) => {
    const level1 = getPlayerSkillLevel(player1.rating);
    const level2 = getPlayerSkillLevel(player2.rating);
    const level1Index = Object.keys(SKILL_LEVELS).indexOf(level1.key);
    const level2Index = Object.keys(SKILL_LEVELS).indexOf(level2.key);
    return Math.abs(level1Index - level2Index) <= 1;
};

export const separatePlayersBySkill = (players, minPlayersPerLevel = 4) => {
    const skillGroups = {};
    Object.keys(SKILL_LEVELS).forEach(key => { skillGroups[key] = []; });

    players.forEach(player => {
        const skillLevel = getPlayerSkillLevel(player.rating);
        if (skillGroups[skillLevel.key]) skillGroups[skillLevel.key].push(player);
    });

    console.log('\n=== SKILL LEVEL DISTRIBUTION ===');
    Object.entries(skillGroups).forEach(([level, playerGroup]) => {
        if (playerGroup.length > 0) {
            console.log(`${SKILL_LEVELS[level].label}: ${playerGroup.length} players - ${playerGroup.map(p => `${p.name}(${p.rating})`).join(', ')}`);
        }
    });

    const bumpedPlayers = [];
    const levelKeys = Object.keys(SKILL_LEVELS);

    // First pass: bump UP
    for (let i = 0; i < levelKeys.length; i++) {
        const levelKey = levelKeys[i];
        const playerGroup = skillGroups[levelKey];
        if (playerGroup.length > 0 && playerGroup.length < minPlayersPerLevel) {
            let targetLevelIndex = i + 1;
            while (targetLevelIndex < levelKeys.length && skillGroups[levelKeys[targetLevelIndex]].length === 0) targetLevelIndex++;
            if (targetLevelIndex < levelKeys.length) {
                const targetLevel = levelKeys[targetLevelIndex];
                console.log(`BUMPING UP: ${playerGroup.map(p => p.name).join(', ')} from ${SKILL_LEVELS[levelKey].label} to ${SKILL_LEVELS[targetLevel].label}`);
                skillGroups[targetLevel].push(...playerGroup);
                bumpedPlayers.push(...playerGroup.map(p => ({ ...p, originalLevel: levelKey, bumpedLevel: targetLevel })));
                skillGroups[levelKey] = [];
            }
        }
    }

    // Second pass: bump DOWN
    for (let i = levelKeys.length - 1; i >= 0; i--) {
        const levelKey = levelKeys[i];
        const playerGroup = skillGroups[levelKey];
        if (playerGroup.length > 0 && playerGroup.length < minPlayersPerLevel) {
            let targetLevelIndex = i - 1;
            while (targetLevelIndex >= 0 && skillGroups[levelKeys[targetLevelIndex]].length === 0) targetLevelIndex--;
            if (targetLevelIndex >= 0) {
                const targetLevel = levelKeys[targetLevelIndex];
                console.log(`BUMPING DOWN: ${playerGroup.map(p => p.name).join(', ')} from ${SKILL_LEVELS[levelKey].label} to ${SKILL_LEVELS[targetLevel].label}`);
                skillGroups[targetLevel].push(...playerGroup);
                bumpedPlayers.push(...playerGroup.map(p => ({ ...p, originalLevel: levelKey, bumpedLevel: targetLevel })));
                skillGroups[levelKey] = [];
            }
        }
    }

    const finalGroups = [];
    const orphanedPlayers = [];

    Object.entries(skillGroups).forEach(([levelKey, playerGroup]) => {
        if (playerGroup.length >= minPlayersPerLevel) {
            finalGroups.push({
                level: levelKey,
                label: SKILL_LEVELS[levelKey].label,
                color: SKILL_LEVELS[levelKey].color,
                players: playerGroup,
                minRating: Math.min(...playerGroup.map(p => p.rating)),
                maxRating: Math.max(...playerGroup.map(p => p.rating)),
            });
        } else if (playerGroup.length > 0) {
            orphanedPlayers.push(...playerGroup);
        }
    });

    if (orphanedPlayers.length > 0) {
        console.warn(`⚠️ ${orphanedPlayers.length} orphaned players: ${orphanedPlayers.map(p => p.name).join(', ')}`);
        if (finalGroups.length > 0) {
            orphanedPlayers.forEach(orphan => {
                let closestGroup = finalGroups[0];
                let smallestRatingDiff = Math.abs(orphan.rating - (closestGroup.minRating + closestGroup.maxRating) / 2);
                finalGroups.forEach(group => {
                    const groupAvg = (group.minRating + group.maxRating) / 2;
                    const diff = Math.abs(orphan.rating - groupAvg);
                    if (diff < smallestRatingDiff) { smallestRatingDiff = diff; closestGroup = group; }
                });
                console.log(`Adding ${orphan.name} (${orphan.rating}) to ${closestGroup.label} group`);
                closestGroup.players.push(orphan);
                closestGroup.minRating = Math.min(closestGroup.minRating, orphan.rating);
                closestGroup.maxRating = Math.max(closestGroup.maxRating, orphan.rating);
                bumpedPlayers.push({ ...orphan, originalLevel: getPlayerSkillLevel(orphan.rating).key, bumpedLevel: closestGroup.level });
            });
        } else {
            console.log(`Creating mixed group with all ${players.length} players`);
            finalGroups.push({
                level: 'MIXED', label: 'Mixed', color: 'bg-gray-100 text-gray-700',
                players: [...players],
                minRating: Math.min(...players.map(p => p.rating)),
                maxRating: Math.max(...players.map(p => p.rating)),
            });
        }
    }

    console.log(`\n=== FINAL SKILL GROUPS (${finalGroups.length} groups) ===`);
    finalGroups.forEach((group, idx) => {
        console.log(`Group ${idx + 1} - ${group.label}: ${group.players.length} players (${group.minRating.toFixed(1)}-${group.maxRating.toFixed(1)})`);
    });

    return { groups: finalGroups, bumpedPlayers };
};
