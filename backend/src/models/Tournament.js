const pool = require('../config/database');

class Tournament {
  // Create a new tournament
  static async create({ user_id, tournament_name, tournament_type, num_courts, tournament_data }) {
    const result = await pool.query(
      `INSERT INTO tournaments (user_id, tournament_name, tournament_type, num_courts, tournament_data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, tournament_name, tournament_type, num_courts, JSON.stringify(tournament_data)]
    );
    return result.rows[0];
  }

  // Get all tournaments for a user
  static async findByUserId(user_id) {
    const result = await pool.query(
      'SELECT * FROM tournaments WHERE user_id = $1 ORDER BY created_at DESC',
      [user_id]
    );
    return result.rows;
  }

  // Get tournament by ID
  static async findById(id, user_id) {
    const result = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1 AND user_id = $2',
      [id, user_id]
    );
    return result.rows[0];
  }

  // Update tournament
  static async update(id, user_id, updates) {
    const { tournament_name, tournament_type, num_courts, tournament_data } = updates;

    const result = await pool.query(
      `UPDATE tournaments
       SET tournament_name = COALESCE($1, tournament_name),
           tournament_type = COALESCE($2, tournament_type),
           num_courts = COALESCE($3, num_courts),
           tournament_data = COALESCE($4, tournament_data),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [
        tournament_name,
        tournament_type,
        num_courts,
        tournament_data ? JSON.stringify(tournament_data) : null,
        id,
        user_id
      ]
    );
    return result.rows[0];
  }

  // Delete tournament
  static async delete(id, user_id) {
    const result = await pool.query(
      'DELETE FROM tournaments WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, user_id]
    );
    return result.rows[0];
  }
}

module.exports = Tournament;
