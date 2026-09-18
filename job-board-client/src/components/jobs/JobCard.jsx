import React from 'react';
import { MapPin, Briefcase, DollarSign, Sparkles, Clock } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const JobCard = ({ job, isSelected = false, onClick }) => {
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const matchPercent = job.score ? Math.round(job.score * 100) : null;

  return (
    <div
      onClick={onClick}
      style={{
        padding: 'var(--space-4)',
        backgroundColor: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        border: `1px solid ${isSelected ? 'var(--border-accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        boxShadow: isSelected ? 'var(--shadow-accent)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <h4
            style={{
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--weight-semibold)',
              color: isSelected ? 'var(--accent-hover)' : 'var(--text-primary)',
              lineHeight: 1.3,
              marginBottom: '4px',
            }}
          >
            {job.title}
          </h4>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            {job.role}
          </div>
        </div>

        {matchPercent !== null && (
          <Badge variant="accent" size="sm" style={{ gap: '3px' }}>
            <Sparkles size={11} />
            <span>{matchPercent}%</span>
          </Badge>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <MapPin size={13} />
          <span>{job.location}</span>
        </div>
        {job.salary && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <DollarSign size={13} />
            <span>{job.salary}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={13} />
          <span>{formatTime(job.createdAt)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <Badge variant="muted" size="sm">
          {job.jobType}
        </Badge>
        {job.experienceLevel && (
          <Badge variant="muted" size="sm">
            {job.experienceLevel}
          </Badge>
        )}
        {job.status === 'closed' && (
          <Badge variant="red" size="sm">
            Closed
          </Badge>
        )}
      </div>
    </div>
  );
};
