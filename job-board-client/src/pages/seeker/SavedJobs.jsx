import React from 'react';
import { Link } from 'react-router-dom';
import { useSavedJobs, useUnsaveJob } from '../../hooks/useSavedJobs';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Bookmark, MapPin, DollarSign, Clock, Trash2, ArrowUpRight } from 'lucide-react';

export const SavedJobs = () => {
  const { data, isLoading } = useSavedJobs();
  const { mutate: unsave, isPending: isUnsaving } = useUnsaveJob();
  const { success, error } = useToast();

  const jobs = data?.jobs || [];

  const handleRemove = (jobId, title) => {
    unsave(jobId, {
      onSuccess: () => success(`Removed "${title}" from saved jobs`),
      onError: (err) => error(err.response?.data?.message || 'Failed to remove saved job'),
    });
  };

  return (
    <div className="container" style={{ maxWidth: '900px', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-1)' }}>
          Saved Positions
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Review and manage roles you've bookmarked for later
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: 'var(--space-4)', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)' }}>
              <Skeleton width="60%" height="20px" style={{ marginBottom: '8px' }} />
              <Skeleton width="40%" height="16px" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved jobs yet"
          description="When browsing jobs, click the 'Save' button to bookmark positions you'd like to apply for."
          action={
            <Link to="/jobs" style={{ textDecoration: 'none' }}>
              <Button variant="primary">Explore Jobs</Button>
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {jobs.map((job) => (
            <div
              key={job._id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4) var(--space-6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Link
                  to={`/jobs/${job._id}`}
                  style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--weight-semibold)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                >
                  {job.title}
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>{job.role}</span>
                  <span>•</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} />
                    <span>{job.location}</span>
                  </div>
                  {job.salary && (
                    <>
                      <span>•</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <DollarSign size={12} />
                        <span>{job.salary}</span>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <Badge variant="accent" size="sm">{job.jobType}</Badge>
                  {job.experienceLevel && <Badge variant="muted" size="sm">{job.experienceLevel}</Badge>}
                  {job.status === 'closed' && <Badge variant="red" size="sm">Closed</Badge>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link to={`/jobs/${job._id}`} style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" size="sm" style={{ gap: '4px' }}>
                    <span>View</span>
                    <ArrowUpRight size={14} />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(job._id, job.title)}
                  disabled={isUnsaving}
                  style={{ color: 'var(--red)', padding: '6px' }}
                  title="Remove bookmark"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
