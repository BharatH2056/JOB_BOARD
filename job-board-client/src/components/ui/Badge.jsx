import React from 'react';

export const Badge = ({
  children,
  variant = 'muted',
  size = 'md',
  className = '',
  style = {},
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'green':
      case 'success':
        return {
          backgroundColor: 'var(--green-bg)',
          color: 'var(--green)',
          border: '1px solid rgba(52, 211, 153, 0.25)',
        };
      case 'red':
      case 'danger':
        return {
          backgroundColor: 'var(--red-bg)',
          color: 'var(--red)',
          border: '1px solid rgba(248, 113, 113, 0.25)',
        };
      case 'yellow':
      case 'warning':
        return {
          backgroundColor: 'var(--yellow-bg)',
          color: 'var(--yellow)',
          border: '1px solid rgba(251, 191, 36, 0.25)',
        };
      case 'blue':
      case 'info':
        return {
          backgroundColor: 'var(--blue-bg)',
          color: 'var(--blue)',
          border: '1px solid rgba(96, 165, 250, 0.25)',
        };
      case 'accent':
        return {
          backgroundColor: 'var(--accent-muted)',
          color: 'var(--accent-hover)',
          border: '1px solid var(--border-accent)',
        };
      case 'muted':
      default:
        return {
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: '2px 6px',
          fontSize: '11px',
        };
      case 'lg':
        return {
          padding: '4px 12px',
          fontSize: 'var(--text-sm)',
        };
      case 'md':
      default:
        return {
          padding: '2px 8px',
          fontSize: 'var(--text-xs)',
        };
    }
  };

  return (
    <span
      className={`badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontWeight: 'var(--weight-medium)',
        borderRadius: 'var(--radius-full)',
        whiteSpace: 'nowrap',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
};
