import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Tile from './Tile';

const GRID_SIZE = 50;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;

export default function Grid({ grid, userId, claimTile, isRecentlyClaimed }) {
  const containerRef = useRef(null);
  const viewportRef = useRef(null);

  // Transform state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Tooltip state
  const [tooltip, setTooltip] = useState(null);

  // Center grid on mount
  useEffect(() => {
    if (containerRef.current && grid) {
      const container = containerRef.current;
      const tileSize = 15; // tile + gap
      const gridPixelSize = GRID_SIZE * tileSize + 80; // plus padding
      const centerX = (container.clientWidth - gridPixelSize) / 2;
      const centerY = (container.clientHeight - gridPixelSize) / 2;
      setTransform({ x: centerX, y: centerY, scale: 1 });
    }
  }, [grid !== null]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;

    setTransform((prev) => {
      const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.scale + delta));
      const ratio = newScale / prev.scale;

      // Zoom toward cursor position
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      return {
        x: mouseX - (mouseX - prev.x) * ratio,
        y: mouseY - (mouseY - prev.y) * ratio,
        scale: newScale,
      };
    });
  }, []);

  // Attach wheel event (non-passive)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Pan handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    // Only start drag if clicking on the container background or grid gap
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transform.x,
      ty: transform.y,
    };
  }, [transform]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTransform((prev) => ({
      ...prev,
      x: dragStart.current.tx + dx,
      y: dragStart.current.ty + dy,
    }));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(MAX_ZOOM, prev.scale + ZOOM_STEP * 2),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(MIN_ZOOM, prev.scale - ZOOM_STEP * 2),
    }));
  }, []);

  const resetZoom = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const tileSize = 15;
      const gridPixelSize = GRID_SIZE * tileSize + 80;
      const centerX = (container.clientWidth - gridPixelSize) / 2;
      const centerY = (container.clientHeight - gridPixelSize) / 2;
      setTransform({ x: centerX, y: centerY, scale: 1 });
    }
  }, []);

  // Tooltip handlers
  const handleTileHover = useCallback((x, y, tile, e) => {
    setTooltip({
      x: e.clientX + 12,
      y: e.clientY - 40,
      tileX: x,
      tileY: y,
      owner: tile?.owner_name || null,
      color: tile?.color || null,
    });
  }, []);

  const handleTileLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // Generate tile grid
  const tiles = useMemo(() => {
    if (!grid) return null;

    const elements = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const key = `${x},${y}`;
        const tile = grid.get(key);
        elements.push(
          <Tile
            key={key}
            x={x}
            y={y}
            tile={tile}
            isRecent={isRecentlyClaimed(x, y)}
            userId={userId}
            onClaim={claimTile}
            onHover={handleTileHover}
            onLeave={handleTileLeave}
          />
        );
      }
    }
    return elements;
  }, [grid, userId, claimTile, isRecentlyClaimed, handleTileHover, handleTileLeave]);

  return (
    <div
      className="grid-container"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      id="grid-container"
    >
      <div
        className="grid-viewport"
        ref={viewportRef}
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        <div className="grid">
          {tiles}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="tile-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="tile-tooltip-coords">
            ({tooltip.tileX}, {tooltip.tileY})
          </div>
          {tooltip.owner ? (
            <div className="tile-tooltip-owner">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: tooltip.color,
                }}
              />
              {tooltip.owner}
            </div>
          ) : (
            <div className="tile-tooltip-unclaimed">Unclaimed — click to capture</div>
          )}
        </div>
      )}

      {/* Zoom controls */}
      <div className="zoom-controls" id="zoom-controls">
        <button className="zoom-btn" onClick={zoomIn} title="Zoom in">+</button>
        <div className="zoom-level">{Math.round(transform.scale * 100)}%</div>
        <button className="zoom-btn" onClick={zoomOut} title="Zoom out">−</button>
        <button
          className="zoom-btn"
          onClick={resetZoom}
          title="Reset zoom"
          style={{ fontSize: '12px', marginTop: '4px' }}
        >
          ↺
        </button>
      </div>
    </div>
  );
}
