const pool = require('../config/database');

/**
 * GET /api/session
 * Returns the active session blob for the logged-in user, or null.
 */
exports.getSession = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT tournament_data, tournament_name, tournament_type, num_courts, updated_at
       FROM tournaments
       WHERE user_id = $1 AND is_active_session = TRUE
       LIMIT 1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.json({ session: null });
        }

        const row = result.rows[0];
        res.json({
            session: {
                ...row.tournament_data,
                tournamentName: row.tournament_name,
                tournamentType: row.tournament_type,
                numCourts: row.num_courts,
                savedAt: row.updated_at
            }
        });
    } catch (error) {
        console.error('getSession error:', error);
        res.status(500).json({ error: 'Failed to load session' });
    }
};

/**
 * PUT /api/session
 * Upserts the active session for the logged-in user.
 * Body: { tournamentName, tournamentType, numCourts, ...sessionData }
 */
exports.saveSession = async (req, res) => {
    try {
        const { tournamentName = 'Active Session', tournamentType = 'roundRobin', numCourts = 1, ...sessionData } = req.body;

        // First clear any existing active session for this user
        await pool.query(
            `UPDATE tournaments SET is_active_session = FALSE WHERE user_id = $1 AND is_active_session = TRUE`,
            [req.user.id]
        );

        // Upsert: try to update an existing "active session" row, otherwise insert
        const existing = await pool.query(
            `SELECT id FROM tournaments WHERE user_id = $1 AND tournament_name = 'Active Session' ORDER BY updated_at DESC LIMIT 1`,
            [req.user.id]
        );

        if (existing.rows.length > 0) {
            await pool.query(
                `UPDATE tournaments
         SET tournament_data = $1, tournament_name = $2, tournament_type = $3, num_courts = $4,
             is_active_session = TRUE, updated_at = NOW()
         WHERE id = $5`,
                [sessionData, tournamentName, tournamentType, numCourts, existing.rows[0].id]
            );
        } else {
            await pool.query(
                `INSERT INTO tournaments (user_id, tournament_name, tournament_type, num_courts, tournament_data, is_active_session)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
                [req.user.id, tournamentName, tournamentType, numCourts, sessionData]
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('saveSession error:', error);
        res.status(500).json({ error: 'Failed to save session' });
    }
};

/**
 * DELETE /api/session
 * Clears the active session flag — called on "End Session".
 */
exports.clearSession = async (req, res) => {
    try {
        await pool.query(
            `UPDATE tournaments SET is_active_session = FALSE WHERE user_id = $1 AND is_active_session = TRUE`,
            [req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('clearSession error:', error);
        res.status(500).json({ error: 'Failed to clear session' });
    }
};
