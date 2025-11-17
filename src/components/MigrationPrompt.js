import React, { useState, useEffect } from 'react';
import { useAPI } from '../hooks/useAPI';
import {
  hasLocalStorageData,
  migrateToBackend,
  clearLocalStorageData,
  createBackupOfLocalStorage
} from '../utils/localStorageMigration';

const MigrationPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [migrationResults, setMigrationResults] = useState(null);
  const api = useAPI();

  useEffect(() => {
    // Check if migration is needed
    const migrationDone = localStorage.getItem('migration_completed');
    if (!migrationDone && hasLocalStorageData()) {
      setShowPrompt(true);
    }
  }, []);

  const handleMigrate = async () => {
    setMigrating(true);

    try {
      // Create backup first
      createBackupOfLocalStorage();

      // Migrate data
      const results = await migrateToBackend(api);

      setMigrationResults(results);
      setMigrationComplete(true);

      // Clear localStorage data after successful migration
      clearLocalStorageData();

      // Mark migration as complete
      localStorage.setItem('migration_completed', 'true');

      setTimeout(() => {
        setShowPrompt(false);
      }, 5000);
    } catch (error) {
      alert('Migration failed. Your data has been backed up. Please try again or contact support.');
    } finally {
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    // Create backup before skipping
    if (window.confirm('Would you like to download a backup of your local data before skipping?')) {
      createBackupOfLocalStorage();
    }

    localStorage.setItem('migration_completed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-gray border border-gray rounded-lg p-6 max-w-md w-full">
        {!migrationComplete ? (
          <>
            <h2 className="text-2xl font-bold text-lime mb-4">
              Local Data Detected
            </h2>
            <p className="text-gray mb-4">
              We found tournament data stored locally in your browser. Would you like to migrate this data to your new account?
            </p>
            <p className="text-gray text-sm mb-6">
              This will:
            </p>
            <ul className="list-disc list-inside text-gray text-sm mb-6 space-y-1">
              <li>Create a backup file (automatically downloaded)</li>
              <li>Upload your players and tournaments to the cloud</li>
              <li>Enable access from any device</li>
            </ul>

            <div className="flex gap-3">
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className="flex-1 bg-lime text-black font-bold py-3 px-4 rounded hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {migrating ? 'Migrating...' : 'Migrate Data'}
              </button>
              <button
                onClick={handleSkip}
                disabled={migrating}
                className="flex-1 bg-gray bg-opacity-20 text-gray font-medium py-3 px-4 rounded hover:bg-opacity-30 transition-all disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-lime mb-4">
              Migration Complete!
            </h2>
            <div className="text-gray mb-4">
              {migrationResults && (
                <>
                  <p className="mb-2">
                    ✅ Players migrated: {migrationResults.players.success}
                  </p>
                  <p className="mb-2">
                    ✅ Tournaments migrated: {migrationResults.tournament.success}
                  </p>
                  {(migrationResults.players.failed > 0 || migrationResults.tournament.failed > 0) && (
                    <p className="text-red-500 text-sm mt-2">
                      Some items failed to migrate. A backup has been downloaded.
                    </p>
                  )}
                </>
              )}
            </div>
            <p className="text-gray text-sm mb-4">
              Your data is now stored in the cloud and accessible from any device!
            </p>
            <button
              onClick={() => setShowPrompt(false)}
              className="w-full bg-lime text-black font-bold py-3 px-4 rounded hover:bg-opacity-90 transition-all"
            >
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MigrationPrompt;
