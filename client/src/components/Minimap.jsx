import { useRef, useEffect } from 'react';

const GRID_SIZE = 50;

export default function Minimap({ grid }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!grid || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pixelSize = canvas.width / GRID_SIZE;

    // Clear
    ctx.fillStyle = '#1a2236';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = grid.get(`${x},${y}`);
        if (tile?.color) {
          ctx.fillStyle = tile.color;
          ctx.fillRect(
            x * pixelSize,
            y * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    }
  }, [grid]);

  return (
    <div className="minimap" id="minimap">
      <span className="minimap-label">Map</span>
      <canvas
        ref={canvasRef}
        className="minimap-canvas"
        width={160}
        height={160}
      />
    </div>
  );
}
