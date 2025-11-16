import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PickleballTournamentManager from './PickleballTournamentManager';
import AuthPage from './components/AuthPage';
import MigrationPrompt from './components/MigrationPrompt';

function AppContent() {
  const { isAuthenticated, loading, user, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-lime text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div>
      {/* Migration prompt for localStorage data */}
      <MigrationPrompt />

      {/* User info bar */}
      <div className="bg-dark-gray border-b border-gray px-4 py-2 flex justify-between items-center">
        <div className="text-white text-sm">
          Welcome, <span className="text-lime font-semibold">{user?.username}</span>
        </div>
        <button
          onClick={logout}
          className="text-gray hover:text-lime text-sm transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Main app */}
      <PickleballTournamentManager />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
