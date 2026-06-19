import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`;
const COOLDOWN_MS = 3000;

export function useGrid(ws) {
  const [grid, setGrid] = useState(null); // Map<"x,y", tile>
  const [leaderboard, setLeaderboard] = useState([]);
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const [recentClaims, setRecentClaims] = useState([]); // {x, y, timestamp} for animations
  const [activityFeed, setActivityFeed] = useState([]);
  const gridRef = useRef(null);

  // Fetch initial grid
  useEffect(() => {
    async function fetchGrid() {
      try {
        const [gridRes, lbRes] = await Promise.all([
          fetch(`${API_URL}/grid`),
          fetch(`${API_URL}/leaderboard`),
        ]);
        const gridData = await gridRes.json();
        const lbData = await lbRes.json();

        // Build grid map
        const gridMap = new Map();
        gridData.tiles.forEach((tile) => {
          gridMap.set(`${tile.x},${tile.y}`, tile);
        });
        setGrid(gridMap);
        gridRef.current = gridMap;
        setLeaderboard(lbData.leaderboard);
      } catch (err) {
        console.error('Failed to fetch grid:', err);
      }
    }
    fetchGrid();
  }, []);

  // Listen for real-time tile updates
  useEffect(() => {
    if (!ws) return;

    const unsubTile = ws.on('tile_update', (tile) => {
      setGrid((prev) => {
        if (!prev) return prev;
        const next = new Map(prev);
        next.set(`${tile.x},${tile.y}`, tile);
        gridRef.current = next;
        return next;
      });

      // Track recent claims for animation
      setRecentClaims((prev) => [
        ...prev.slice(-20),
        { x: tile.x, y: tile.y, timestamp: Date.now() },
      ]);

      // Add to activity feed
      setActivityFeed((prev) => [
        {
          id: Date.now(),
          username: tile.owner_name,
          color: tile.color,
          x: tile.x,
          y: tile.y,
          action: tile.action,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 14),
      ]);
    });

    const unsubLb = ws.on('leaderboard_update', (lb) => {
      setLeaderboard(lb);
    });

    const unsubError = ws.on('error', (err) => {
      if (err.code === 'COOLDOWN') {
        setCooldownEnd(Date.now() + (err.remaining_ms || COOLDOWN_MS));
      }
    });

    return () => {
      unsubTile();
      unsubLb();
      unsubError();
    };
  }, [ws]);

  // Clear old recent claims
  useEffect(() => {
    const timer = setInterval(() => {
      setRecentClaims((prev) =>
        prev.filter((c) => Date.now() - c.timestamp < 1500)
      );
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Claim a tile
  const claimTile = useCallback((x, y) => {
    if (!ws) return false;

    // Check cooldown
    if (Date.now() < cooldownEnd) {
      return false;
    }

    ws.send({
      type: 'claim_tile',
      x,
      y,
    });

    // Set cooldown optimistically
    setCooldownEnd(Date.now() + COOLDOWN_MS);
    return true;
  }, [ws, cooldownEnd]);

  // Check if a tile was recently claimed (for animation)
  const isRecentlyClaimed = useCallback((x, y) => {
    return recentClaims.some((c) => c.x === x && c.y === y);
  }, [recentClaims]);

  return {
    grid,
    leaderboard,
    cooldownEnd,
    activityFeed,
    claimTile,
    isRecentlyClaimed,
  };
}
