const WebSocket = require('ws');
const pool = require('./db');
require('dotenv').config();

const COOLDOWN_MS = parseInt(process.env.COOLDOWN_MS || '3000');
const GRID_WIDTH = parseInt(process.env.GRID_WIDTH || '50');
const GRID_HEIGHT = parseInt(process.env.GRID_HEIGHT || '50');

// Track connected clients
const clients = new Map(); // ws -> { userId, username, color }

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  // Broadcast to all connected clients
  function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Broadcast online user count
  function broadcastUserCount() {
    broadcast({
      type: 'user_count',
      count: clients.size,
    });
  }

  // Handle new connection
  wss.on('connection', (ws) => {
    console.log('🔌 Client connected');

    // Heartbeat
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle messages
    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        return;
      }

      switch (msg.type) {
        case 'register':
          await handleRegister(ws, msg);
          break;
        case 'claim_tile':
          await handleClaimTile(ws, msg);
          break;
        default:
          ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      const clientInfo = clients.get(ws);
      if (clientInfo) {
        console.log(`👋 ${clientInfo.username} disconnected`);
      }
      clients.delete(ws);
      broadcastUserCount();
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      clients.delete(ws);
    });
  });

  // Register user on this WebSocket connection
  async function handleRegister(ws, msg) {
    const { userId, username, color } = msg;
    if (!userId || !username) {
      ws.send(JSON.stringify({ type: 'error', message: 'Missing userId or username' }));
      return;
    }

    clients.set(ws, { userId, username, color });
    console.log(`✅ ${username} registered (${userId})`);

    ws.send(JSON.stringify({
      type: 'registered',
      userId,
    }));

    broadcastUserCount();
  }

  // Handle tile claim
  async function handleClaimTile(ws, msg) {
    const clientInfo = clients.get(ws);
    if (!clientInfo) {
      ws.send(JSON.stringify({ type: 'error', message: 'Not registered' }));
      return;
    }

    const { x, y } = msg;
    const { userId, username, color } = clientInfo;

    // Validate coordinates
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid coordinates' }));
      return;
    }

    // Use a transaction for atomicity
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check cooldown
      const userResult = await client.query(
        'SELECT last_action_at FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length > 0) {
        const lastAction = new Date(userResult.rows[0].last_action_at);
        const elapsed = Date.now() - lastAction.getTime();
        if (elapsed < COOLDOWN_MS) {
          const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
          ws.send(JSON.stringify({
            type: 'error',
            code: 'COOLDOWN',
            message: `Cooldown active. Wait ${remaining}s`,
            remaining_ms: COOLDOWN_MS - elapsed,
          }));
          await client.query('ROLLBACK');
          return;
        }
      }

      // Lock the tile row to prevent concurrent modifications
      const tileResult = await client.query(
        'SELECT * FROM tiles WHERE x = $1 AND y = $2 FOR UPDATE',
        [x, y]
      );

      if (tileResult.rows.length === 0) {
        ws.send(JSON.stringify({ type: 'error', message: 'Tile not found' }));
        await client.query('ROLLBACK');
        return;
      }

      const tile = tileResult.rows[0];
      const previousOwnerId = tile.owner_id;

      // Don't allow claiming your own tile
      if (previousOwnerId === userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'You already own this tile' }));
        await client.query('ROLLBACK');
        return;
      }

      // Update tile ownership
      await client.query(
        'UPDATE tiles SET owner_id = $1, color = $2, claimed_at = NOW() WHERE x = $3 AND y = $4',
        [userId, color, x, y]
      );

      // Update user's last action time and tile count
      await client.query(
        'UPDATE users SET last_action_at = NOW(), tiles_owned = tiles_owned + 1 WHERE id = $1',
        [userId]
      );

      // Decrease previous owner's tile count
      if (previousOwnerId) {
        await client.query(
          'UPDATE users SET tiles_owned = GREATEST(tiles_owned - 1, 0) WHERE id = $1',
          [previousOwnerId]
        );
      }

      // Log activity
      const action = previousOwnerId ? 'steal' : 'claim';
      await client.query(
        'INSERT INTO activity_log (user_id, tile_x, tile_y, previous_owner_id, action) VALUES ($1, $2, $3, $4, $5)',
        [userId, x, y, previousOwnerId, action]
      );

      await client.query('COMMIT');

      // Broadcast tile update to ALL clients
      const updatePayload = {
        type: 'tile_update',
        tile: {
          x,
          y,
          owner_id: userId,
          owner_name: username,
          color,
          claimed_at: new Date().toISOString(),
          action,
          previous_owner_id: previousOwnerId,
        },
      };
      broadcast(updatePayload);

      // Also broadcast updated leaderboard
      const leaderboard = await pool.query(`
        SELECT u.id, u.username, u.color, u.tiles_owned
        FROM users u
        WHERE u.tiles_owned > 0
        ORDER BY u.tiles_owned DESC
        LIMIT 15
      `);
      broadcast({
        type: 'leaderboard_update',
        leaderboard: leaderboard.rows,
      });

      console.log(`🎯 ${username} ${action}ed tile (${x},${y})`);

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error claiming tile:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to claim tile' }));
    } finally {
      client.release();
    }
  }

  // Heartbeat interval — detect dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        clients.delete(ws);
        ws.terminate();
        broadcastUserCount();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

module.exports = { setupWebSocket };
