import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const useAPI = () => {
  const { token, logout } = useAuth();

  const fetchAPI = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
      });

      // If unauthorized, logout user
      if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please login again.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Tournament API calls
  const tournaments = {
    getAll: () => fetchAPI('/api/tournaments'),
    getOne: (id) => fetchAPI(`/api/tournaments/${id}`),
    create: (tournamentData) => fetchAPI('/api/tournaments', {
      method: 'POST',
      body: JSON.stringify(tournamentData)
    }),
    update: (id, tournamentData) => fetchAPI(`/api/tournaments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tournamentData)
    }),
    delete: (id) => fetchAPI(`/api/tournaments/${id}`, {
      method: 'DELETE'
    })
  };

  // Player API calls
  const players = {
    getAll: () => fetchAPI('/api/players'),
    getOne: (id) => fetchAPI(`/api/players/${id}`),
    create: (playerData) => fetchAPI('/api/players', {
      method: 'POST',
      body: JSON.stringify(playerData)
    }),
    bulkCreate: (playersArray) => fetchAPI('/api/players/bulk', {
      method: 'POST',
      body: JSON.stringify({ players: playersArray })
    }),
    update: (id, playerData) => fetchAPI(`/api/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(playerData)
    }),
    delete: (id) => fetchAPI(`/api/players/${id}`, {
      method: 'DELETE'
    })
  };

  return {
    tournaments,
    players,
    fetchAPI
  };
};
