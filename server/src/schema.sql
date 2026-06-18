-- GridWars Database Schema

-- Users table (lightweight, no auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(30) NOT NULL,
  color VARCHAR(7) NOT NULL,
  tiles_owned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  last_action_at TIMESTAMP DEFAULT NOW()
);

-- Grid tiles
CREATE TABLE IF NOT EXISTS tiles (
  id SERIAL PRIMARY KEY,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  color VARCHAR(7),
  claimed_at TIMESTAMP,
  UNIQUE(x, y)
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tile_x INTEGER NOT NULL,
  tile_y INTEGER NOT NULL,
  previous_owner_id UUID,
  action VARCHAR(10) DEFAULT 'claim',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tiles_coords ON tiles(x, y);
CREATE INDEX IF NOT EXISTS idx_tiles_owner ON tiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
