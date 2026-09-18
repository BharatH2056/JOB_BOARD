import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

export const JobFilters = ({ filters, onChange, onReset }) => {
  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  const hasActiveFilters = Boolean(
    filters.role || filters.location || filters.jobType || filters.experienceLevel
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: 'var(--space-3)',
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-secondary)' }}>
          <Filter size={14} />
          <span>Filter Jobs</span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-hover)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
        }}
      >
        <div>
          <input
            type="text"
            placeholder="Role (e.g. Frontend)"
            value={filters.role || ''}
            onChange={(e) => handleChange('role', e.target.value)}
            style={{ fontSize: 'var(--text-xs)', padding: '6px 10px' }}
          />
        </div>

        <div>
          <input
            type="text"
            placeholder="Location (e.g. Remote)"
            value={filters.location || ''}
            onChange={(e) => handleChange('location', e.target.value)}
            style={{ fontSize: 'var(--text-xs)', padding: '6px 10px' }}
          />
        </div>

        <div>
          <select
            value={filters.jobType || ''}
            onChange={(e) => handleChange('jobType', e.target.value)}
            style={{ fontSize: 'var(--text-xs)', padding: '6px 10px' }}
          >
            <option value="">All Job Types</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="internship">Internship</option>
            <option value="remote">Remote</option>
          </select>
        </div>

        <div>
          <select
            value={filters.experienceLevel || ''}
            onChange={(e) => handleChange('experienceLevel', e.target.value)}
            style={{ fontSize: 'var(--text-xs)', padding: '6px 10px' }}
          >
            <option value="">All Levels</option>
            <option value="Junior">Junior</option>
            <option value="Mid">Mid</option>
            <option value="Senior">Senior</option>
            <option value="Lead">Lead</option>
          </select>
        </div>
      </div>
    </div>
  );
};
