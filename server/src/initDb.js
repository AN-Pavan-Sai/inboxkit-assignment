const fs = require('fs');
const path = require('path');
const pool = require('./db');
require('dotenv').config();

const GRID_WIDTH = parseInt(process.env.GRID_WIDTH || '50');
const GRID_HEIGHT = parseInt(process.env.GRID_HEIGHT || '50');

async function initDb() {
  const client = await pool.connect();
  try {
    // Run schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await client.query(schema);
    console.log('✅ Schema created successfully');

    // Check if tiles already exist
    const { rows } = await client.query('SELECT COUNT(*) as count FROM tiles');
    const tileCount = parseInt(rows[0].count);

    if (tileCount === 0) {
      console.log(`🔲 Seeding ${GRID_WIDTH}x${GRID_HEIGHT} grid (${GRID_WIDTH * GRID_HEIGHT} tiles)...`);

      // Batch insert tiles for performance
      const batchSize = 500;
      let values = [];
      let paramIndex = 1;
      let query = 'INSERT INTO tiles (x, y) VALUES ';
      const params = [];

      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          values.push(`($${paramIndex++}, $${paramIndex++})`);
          params.push(x, y);

          if (values.length >= batchSize) {
            await client.query(query + values.join(', '), params);
            values = [];
            params.length = 0;
            paramIndex = 1;
          }
        }
      }

      // Insert remaining tiles
      if (values.length > 0) {
        await client.query(query + values.join(', '), params);
      }

      console.log(`✅ Seeded ${GRID_WIDTH * GRID_HEIGHT} tiles`);
    } else {
      console.log(`ℹ️  Grid already has ${tileCount} tiles, skipping seed`);
    }

    console.log('🚀 Database initialization complete!');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

initDb();
