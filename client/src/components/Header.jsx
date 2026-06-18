import { useState, useEffect } from 'react';

export default function Header({ user, onlineCount, wsStatus, cooldownEnd }) {
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Cooldown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, cooldownEnd - Date.now());
      setCooldownRemaining(remaining);
    }, 50);
    return () => clearInterval(timer);
  }, [cooldownEnd]);

  const cooldownProgress = cooldownRemaining > 0 ? cooldownRemaining / 3000 : 0;
  const circumference = 2 * Math.PI * 14; // radius 14

  const statusLabel =
    wsStatus === 'connected' ? 'Live' :
    wsStatus === 'connecting' ? 'Connecting' :
    'Offline';

  return (
    <header className="header" id="app-header">
      <div className="header-brand">
        <span className="header-logo">⚔️</span>
        <div>
          <div className="header-title">GridWars</div>
          <div className="header-subtitle">Real-time Territory Control</div>
        </div>
      </div>

      <div className="header-center">
        <div className="header-stat">
          <div className="online-dot" />
          <span className="header-stat-value">{onlineCount}</span>
          <span>online</span>
        </div>

        <div className={`connection-status ${wsStatus}`}>
          <span className="connection-dot" />
          {statusLabel}
        </div>
      </div>

      <div className="header-right">
        {/* Cooldown ring */}
        {cooldownRemaining > 0 && (
          <div className="cooldown-wrapper" title="Cooldown active">
            <svg className="cooldown-ring" viewBox="0 0 36 36">
              <circle
                className="cooldown-ring-bg"
                cx="18" cy="18" r="14"
              />
              <circle
                className="cooldown-ring-fg"
                cx="18" cy="18" r="14"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - cooldownProgress)}
              />
            </svg>
            <div className="cooldown-text">
              {Math.ceil(cooldownRemaining / 1000)}s
            </div>
          </div>
        )}

        {user && (
          <div className="user-badge" id="user-badge">
            <div
              className="user-color-dot"
              style={{ backgroundColor: user.color }}
            />
            <span>{user.username}</span>
          </div>
        )}
      </div>
    </header>
  );
}
