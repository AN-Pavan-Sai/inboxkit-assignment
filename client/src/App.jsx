import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useGrid } from './hooks/useGrid';
import UserSetup from './components/UserSetup';
import Header from './components/Header';
import Grid from './components/Grid';
import Leaderboard from './components/Leaderboard';
import Minimap from './components/Minimap';
import ToastContainer, { useToasts } from './components/Toast';
import ActivityFeed from './components/ActivityFeed';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { toasts, addToast } = useToasts();

  // Check for existing user on mount
  useEffect(() => {
    const stored = localStorage.getItem('gridwars_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Verify user still exists on server
        fetch('http://localhost:3001/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: parsed.id }),
        })
          .then((res) => res.json())
          .then(({ user: existingUser }) => {
            if (existingUser) {
              setUser(existingUser);
            }
            setLoading(false);
          })
          .catch(() => {
            localStorage.removeItem('gridwars_user');
            setLoading(false);
          });
      } catch {
        localStorage.removeItem('gridwars_user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // WebSocket connection
  const ws = useWebSocket(user?.id, user?.username, user?.color);

  // Grid state
  const {
    grid,
    leaderboard,
    cooldownEnd,
    activityFeed,
    claimTile,
    isRecentlyClaimed,
  } = useGrid(ws);

  // Listen for tile steal notifications
  useEffect(() => {
    if (!ws || !user) return;

    const unsub = ws.on('tile_update', (tile) => {
      if (tile.previous_owner_id === user.id && tile.owner_id !== user.id) {
        addToast(`${tile.owner_name} stole your tile at (${tile.x}, ${tile.y})!`, '😱');
      } else if (tile.owner_id === user.id) {
        const verb = tile.action === 'steal' ? 'Captured' : 'Claimed';
        addToast(`${verb} tile (${tile.x}, ${tile.y})`, '🎯');
      }
    });

    return unsub;
  }, [ws, user, addToast]);

  // Handle user creation from setup modal
  const handleUserCreated = (newUser) => {
    setUser(newUser);
    addToast(`Welcome, ${newUser.username}! Click tiles to claim them.`, '👋');
  };

  // Loading screen
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div className="loading-text">Loading GridWars...</div>
      </div>
    );
  }

  // User setup
  if (!user) {
    return <UserSetup onComplete={handleUserCreated} />;
  }

  // Main app
  return (
    <div className="app" id="gridwars-app">
      <Header
        user={user}
        onlineCount={ws.onlineCount}
        wsStatus={ws.status}
        cooldownEnd={cooldownEnd}
      />

      <div className="app-body">
        {/* Main grid area */}
        <Grid
          grid={grid}
          userId={user.id}
          claimTile={claimTile}
          isRecentlyClaimed={isRecentlyClaimed}
        />

        {/* Minimap */}
        <Minimap grid={grid} />

        {/* Sidebar */}
        <aside className="sidebar" id="sidebar">
          <Leaderboard
            leaderboard={leaderboard}
            currentUserId={user.id}
          />

          {/* Stats */}
          <div className="stats-panel">
            <div className="stats-title">📊 Grid Stats</div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-value">
                  {grid ? [...grid.values()].filter((t) => t.owner_id).length : 0}
                </div>
                <div className="stat-card-label">Claimed</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">
                  {grid ? 2500 - [...grid.values()].filter((t) => t.owner_id).length : 2500}
                </div>
                <div className="stat-card-label">Available</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">
                  {grid ? [...grid.values()].filter((t) => t.owner_id === user.id).length : 0}
                </div>
                <div className="stat-card-label">Your Tiles</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">
                  {leaderboard.length}
                </div>
                <div className="stat-card-label">Players</div>
              </div>
            </div>
          </div>

          {/* Activity feed */}
          <ActivityFeed activities={activityFeed} />
        </aside>
      </div>

      {/* Toasts */}
      <ToastContainer toasts={toasts} />

      {/* Loading overlay when grid is loading */}
      {!grid && (
        <div className="loading-screen" style={{ background: 'rgba(6, 8, 15, 0.9)' }}>
          <div className="loading-spinner" />
          <div className="loading-text">Loading grid...</div>
        </div>
      )}
    </div>
  );
}
