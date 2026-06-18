export default function Leaderboard({ leaderboard, currentUserId }) {
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="leaderboard">
        <div className="leaderboard-header">
          <div className="leaderboard-title">
            🏆 Leaderboard
          </div>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '24px 16px',
          color: 'var(--text-muted)',
          fontSize: '13px',
        }}>
          No tiles claimed yet.<br />Be the first!
        </div>
      </div>
    );
  }

  const maxTiles = leaderboard[0]?.tiles_owned || 1;

  return (
    <div className="leaderboard" id="leaderboard">
      <div className="leaderboard-header">
        <div className="leaderboard-title">
          🏆 Leaderboard
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Top {leaderboard.length}
        </span>
      </div>

      <div className="leaderboard-list">
        {leaderboard.map((entry, index) => {
          const rank = index + 1;
          const barWidth = (entry.tiles_owned / maxTiles) * 100;
          const isCurrentUser = entry.id === currentUserId;

          let className = 'leaderboard-item';
          if (rank === 1) className += ' top-1';
          else if (rank === 2) className += ' top-2';
          else if (rank === 3) className += ' top-3';

          return (
            <div
              key={entry.id}
              className={className}
              style={isCurrentUser ? {
                borderColor: 'var(--border-accent)',
                boxShadow: '0 0 8px var(--accent-glow)',
              } : undefined}
            >
              <span className="leaderboard-rank">
                {rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
              </span>
              <div
                className="leaderboard-color"
                style={{ backgroundColor: entry.color }}
              />
              <span className="leaderboard-name">
                {entry.username}
                {isCurrentUser && (
                  <span style={{ fontSize: '10px', color: 'var(--accent-primary)', marginLeft: '4px' }}>
                    (you)
                  </span>
                )}
              </span>
              <span className="leaderboard-count">{entry.tiles_owned}</span>

              {/* Progress bar */}
              <div
                className="leaderboard-bar"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: entry.color,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
