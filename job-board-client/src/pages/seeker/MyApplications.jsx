import React from 'react';
import { Link } from 'react-router-dom';
import { useSeekerApplications } from '../../hooks/useApplications';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { FileText, Calendar, ExternalLink, ArrowUpRight } from 'lucide-react';

export const MyApplications = () => {
  const { data, isLoading } = useSeekerApplications();
  const applications = data?.applications || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'reviewed':
        return <Badge variant="blue">Under Review</Badge>;
      case 'rejected':
        return <Badge variant="red">Declined</Badge>;
      case 'applied':
      default:
        return <Badge variant="yellow">Submitted</Badge>;
    }
  };

  return (
    <div className="container" style={{ maxWidth: '900px', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-1)' }}>
          My Applications
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Track the progress and review status of your active submissions
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: 'var(--space-4)', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)' }}>
              <Skeleton width="50%" height="20px" style={{ marginBottom: '8px' }} />
              <Skeleton width="30%" height="16px" />
            </div>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No applications submitted yet"
          description="You haven't applied to any positions. Find a role that matches your skills and submit your application."
          action={
            <Link to="/jobs" style={{ textDecoration: 'none' }}>
              <Button variant="primary">Find Opportunities</Button>
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {applications.map((app) => {
            const job = app.jobId || {};
            const jobId = job._id || app.jobId;
            const jobTitle = job.title || 'Role Application';
            const appliedDate = app.appliedAt || app.createdAt;

            return (
              <div
                key={app._id}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
                      {jobTitle}
                    </h3>
                    {getStatusBadge(app.status)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {job.location && <span>{job.location}</span>}
                    {appliedDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} />
                        <span>Applied on {new Date(appliedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    )}
                  </div>

                  {app.resumeUrl && (
                    <div style={{ marginTop: '4px' }}>
                      <a
                        href={app.resumeUrl.startsWith('http') ? app.resumeUrl : `http://localhost:5000/${app.resumeUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--accent-hover)',
                        }}
                      >
                        <ExternalLink size={12} />
                        <span>View Attached Resume</span>
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  {jobId && (
                    <Link to={`/jobs/${jobId}`} style={{ textDecoration: 'none' }}>
                      <Button variant="secondary" size="sm" style={{ gap: '4px' }}>
                        <span>View Listing</span>
                        <ArrowUpRight size={14} />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
