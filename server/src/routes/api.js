const express = require('express');
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Curated color palette — vibrant, distinguishable colors
const USER_COLORS = [
  '#FF6B6B', '#FF8E53', '#FFCD56', '#6BCB77', '#4D96FF',
  '#9B59B6', '#E84393', '#00CEC9', '#FD79A8', '#6C5CE7',
  '#00B894', '#FDCB6E', '#E17055', '#0984E3', '#D63031',
  '#A29BFE', '#55EFC4', '#FF7675', '#74B9FF', '#DFE6E9',
  '#F8A5C2', '#778BEB', '#63CDDA', '#CF6A87', '#786FA6',
  '#F19066', '#3DC1D3', '#E66767', '#574B90', '#F5CD79',
  '#546DE5', '#E15F41', '#C44569', '#F78FB3', '#3B3B98',
];

// GET /api/grid — Full grid state
router.get('/grid', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.x, t.y, t.owner_id, t.color, t.claimed_at,
             u.username as owner_name
      FROM tiles t
      LEFT JOIN users u ON t.owner_id = u.id
      ORDER BY t.y, t.x
    `);
    res.json({ tiles: rows });
  } catch (err) {
    console.error('Error fetching grid:', err);
    res.status(500).json({ error: 'Failed to fetch grid' });
  }
});

// GET /api/leaderboard — Top users by tiles owned
router.get('/leaderboard', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.username, u.color, u.tiles_owned
      FROM users u
      WHERE u.tiles_owned > 0
      ORDER BY u.tiles_owned DESC
      LIMIT 15
    `);
    res.json({ leaderboard: rows });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/stats — Global stats
router.get('/stats', async (req, res) => {
  try {
    const [totalTiles, claimedTiles, totalUsers, recentActivity] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM tiles'),
      pool.query('SELECT COUNT(*) as count FROM tiles WHERE owner_id IS NOT NULL'),
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query(`
        SELECT a.tile_x, a.tile_y, a.action, a.created_at,
               u.username, u.color
        FROM activity_log a
        JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 10
      `),
    ]);

    res.json({
      total_tiles: parseInt(totalTiles.rows[0].count),
      claimed_tiles: parseInt(claimedTiles.rows[0].count),
      total_users: parseInt(totalUsers.rows[0].count),
      recent_activity: recentActivity.rows,
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// POST /api/user — Create or retrieve user
router.post('/user', async (req, res) => {
  try {
    const { username, userId } = req.body;

    // If userId provided, try to find existing user
    if (userId) {
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (rows.length > 0) {
        return res.json({ user: rows[0] });
      }
    }

    // Create new user
    if (!username || username.trim().length === 0) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const trimmedName = username.trim().substring(0, 30);
    const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

    const { rows } = await pool.query(
      'INSERT INTO users (username, color) VALUES ($1, $2) RETURNING *',
      [trimmedName, color]
    );

    res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

module.exports = router;
