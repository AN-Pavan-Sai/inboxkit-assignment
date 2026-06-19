import { useState, useMemo } from 'react';

const USER_COLORS = [
  '#FF6B6B', '#FF8E53', '#FFCD56', '#6BCB77', '#4D96FF',
  '#9B59B6', '#E84393', '#00CEC9', '#FD79A8', '#6C5CE7',
  '#00B894', '#FDCB6E', '#E17055', '#0984E3', '#D63031',
  '#A29BFE', '#55EFC4', '#FF7675', '#74B9FF', '#DFE6E9',
  '#F8A5C2', '#778BEB', '#63CDDA', '#CF6A87', '#786FA6',
];

export default function UserSetup({ onComplete }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const randomColor = useMemo(() => {
    return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter a username');
      return;
    }
    if (trimmed.length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }

      const { user } = await res.json();

      // Store in localStorage
      localStorage.setItem('gridwars_user', JSON.stringify(user));
      onComplete(user);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-emoji">⚔️</div>
        <h1 className="modal-title">Welcome to GridWars</h1>
        <p className="modal-subtitle">
          Claim tiles, build territory, and compete with players<br />
          from around the world — all in real time.
        </p>

        <div className="modal-input-group">
          <label className="modal-label" htmlFor="username-input">Choose your name</label>
          <input
            id="username-input"
            className="modal-input"
            type="text"
            placeholder="Enter a cool username..."
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError('');
            }}
            maxLength={30}
            autoFocus
            autoComplete="off"
          />
        </div>

        <div className="modal-color-preview">
          <div
            className="modal-color-swatch"
            style={{ backgroundColor: randomColor }}
          />
          <div className="modal-color-info">
            <div className="modal-color-label">Your Battle Color</div>
            <div className="modal-color-hint">
              Randomly assigned — this is how your tiles will look
            </div>
          </div>
        </div>

        {error && (
          <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px', fontWeight: 500 }}>
            {error}
          </p>
        )}

        <button
          className="modal-btn"
          type="submit"
          disabled={loading || !username.trim()}
        >
          {loading ? 'Joining...' : 'Enter the Grid →'}
        </button>
      </form>
    </div>
  );
}
