require('dotenv').config();
const { Client } = require('pg');

const clearDatabase = async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Permissive SSL for scripts
    });

    try {
        await client.connect();
        console.log('✅ Connected to database.');

        // Truncate users table (and cascade if there are relations like tournaments/matches)
        console.log('🗑️  Clearing all users...');
        await client.query('TRUNCATE TABLE users CASCADE;');

        console.log('✨ Database cleared successfully!');
    } catch (error) {
        console.error('❌ Error clearing database:', error);
    } finally {
        await client.end();
        process.exit();
    }
};

clearDatabase();
