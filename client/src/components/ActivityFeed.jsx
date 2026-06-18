export default function ActivityFeed({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="activity-feed">
        <div className="activity-title">⚡ Live Activity</div>
        <div style={{
          textAlign: 'center',
          padding: '16px',
          color: 'var(--text-muted)',
          fontSize: '12px',
        }}>
          Waiting for activity...
        </div>
      </div>
    );
  }

  const formatTime = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <div className="activity-feed" id="activity-feed">
      <div className="activity-title">⚡ Live Activity</div>
      <div className="activity-list">
        {activities.slice(0, 10).map((item) => (
          <div key={item.id} className="activity-item">
            <div
              className="activity-item-dot"
              style={{ backgroundColor: item.color }}
            />
            <span className="activity-item-name">{item.username}</span>
            <span style={{ color: 'var(--text-muted)' }}>
              {item.action === 'steal' ? 'stole' : 'claimed'}
            </span>
            <span className="activity-item-coords">
              ({item.x},{item.y})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
