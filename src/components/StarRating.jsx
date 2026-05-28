import React from 'react';

const StarRating = ({ value }) => {
  const val = Number(value) || 0;
  return (
    <span style={{ display: 'inline-flex', fontSize: 'inherit', gap: '1px' }}>
      {[1, 2, 3, 4, 5].map(i => {
        const fill = Math.min(1, Math.max(0, val - (i - 1)));
        return (
          <span key={i} style={{ position: 'relative', color: '#E0E0E0', lineHeight: 1 }}>
            ★
            <span style={{
              position: 'absolute', left: 0, top: 0,
              overflow: 'hidden',
              width: `${fill * 100}%`,
              color: '#F59E0B',
              whiteSpace: 'nowrap'
            }}>★</span>
          </span>
        );
      })}
    </span>
  );
};

export default StarRating;
