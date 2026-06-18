import { memo } from 'react';

const Tile = memo(function Tile({ x, y, tile, isRecent, userId, onClaim, onHover, onLeave }) {
  const isClaimed = !!tile?.owner_id;
  const isOwn = tile?.owner_id === userId;

  const handleClick = (e) => {
    e.stopPropagation();
    if (!isOwn) {
      onClaim(x, y);
    }
  };

  const handleMouseEnter = (e) => {
    onHover(x, y, tile, e);
  };

  let className = 'tile';
  if (isClaimed) className += ' claimed';
  if (isRecent) className += ' just-claimed';

  const style = {};
  if (isClaimed && tile.color) {
    style.backgroundColor = tile.color;
    style['--tile-color'] = tile.color;
    if (isOwn) {
      style.boxShadow = `inset 0 0 0 1px rgba(255,255,255,0.25)`;
    }
  }

  return (
    <div
      className={className}
      style={style}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onLeave}
      data-x={x}
      data-y={y}
    />
  );
});

export default Tile;
