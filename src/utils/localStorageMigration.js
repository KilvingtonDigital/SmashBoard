/**
 * Utility to migrate localStorage data to backend API
 */

export const hasLocalStorageData = () => {
  const roster = localStorage.getItem('pb_roster');
  const session = localStorage.getItem('pb_session');
  return !!(roster || session);
};

export const getLocalStorageData = () => {
  try {
    const rosterData = localStorage.getItem('pb_roster');
    const sessionData = localStorage.getItem('pb_session');

    const roster = rosterData ? JSON.parse(rosterData) : [];
    const session = sessionData ? JSON.parse(sessionData) : null;

    return { roster, session };
  } catch (error) {
    console.error('Error reading localStorage data:', error);
    return { roster: [], session: null };
  }
};

export const migrateToBackend = async (api) => {
  try {
    const { roster, session } = getLocalStorageData();

    const results = {
      players: { success: 0, failed: 0 },
      tournament: { success: 0, failed: 0 }
    };

    // Migrate roster (players)
    if (roster && roster.length > 0) {
      const playersToCreate = roster.map(player => ({
        player_name: player.name || player.player_name,
        dupr_rating: player.dupr || player.dupr_rating || null,
        gender: player.gender || ''
      }));

      const result = await api.players.bulkCreate(playersToCreate);

      if (result.success) {
        results.players.success = playersToCreate.length;
      } else {
        results.players.failed = playersToCreate.length;
        console.error('Failed to migrate players:', result.error);
      }
    }

    // Migrate session (tournament)
    if (session && session.tournamentType) {
      const tournamentData = {
        tournament_name: session.tournamentName || 'Migrated Tournament',
        tournament_type: session.tournamentType,
        num_courts: session.numCourts || 1,
        tournament_data: session
      };

      const result = await api.tournaments.create(tournamentData);

      if (result.success) {
        results.tournament.success = 1;
      } else {
        results.tournament.failed = 1;
        console.error('Failed to migrate tournament:', result.error);
      }
    }

    return results;
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};

export const clearLocalStorageData = () => {
  localStorage.removeItem('pb_roster');
  localStorage.removeItem('pb_session');
};

export const createBackupOfLocalStorage = () => {
  const data = getLocalStorageData();
  const backup = JSON.stringify(data, null, 2);
  const blob = new Blob([backup], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `smashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
