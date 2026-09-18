import React from 'react';

export const Spinner = ({ size = 24, color = 'var(--accent)', style = {} }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          border: `2px solid ${color}`,
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
    </div>
  );
};
