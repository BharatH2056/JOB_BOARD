import React from 'react';
import { useSkillGap } from '../../hooks/useSkillGap';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const SkillGap = ({ jobId }) => {
  const { data, isLoading, isError } = useSkillGap(jobId);

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
        <Skeleton width="140px" height="18px" style={{ marginBottom: '8px' }} />
        <div style={{ display: 'flex', gap: '6px' }}>
          <Skeleton width="60px" height="24px" />
          <Skeleton width="80px" height="24px" />
          <Skeleton width="70px" height="24px" />
        </div>
      </div>
    );
  }

  if (isError || !data || (!data.matchingSkills?.length && !data.missingSkills?.length)) {
    return null;
  }

  const { matchingSkills = [], missingSkills = [] } = data;
  const total = matchingSkills.length + missingSkills.length;
  const matchRate = total > 0 ? Math.round((matchingSkills.length / total) * 100) : 0;

  return (
    <div
      style={{
        padding: 'var(--space-4)',
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>
          <Sparkles size={16} color="var(--accent-hover)" />
          <span>Profile Skill Match</span>
        </div>
        <Badge variant={matchRate >= 70 ? 'green' : matchRate >= 40 ? 'yellow' : 'muted'} size="sm">
          {matchRate}% Match
        </Badge>
      </div>

      {matchingSkills.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--green)', marginBottom: '6px' }}>
            <CheckCircle2 size={13} />
            <span>Matching Skills ({matchingSkills.length})</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {matchingSkills.map((skill, i) => (
              <Badge key={i} variant="green" size="sm">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {missingSkills.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--red)', marginBottom: '6px' }}>
            <AlertCircle size={13} />
            <span>Skills to Learn ({missingSkills.length})</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {missingSkills.map((skill, i) => (
              <Badge key={i} variant="red" size="sm">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
