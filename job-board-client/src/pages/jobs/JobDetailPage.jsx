import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useJob } from '../../hooks/useJobs';
import { JobDetail } from '../../components/jobs/JobDetail';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Briefcase, ArrowLeft } from 'lucide-react';

export const JobDetailPage = () => {
  const { id } = useParams();
  const { data, isLoading, isError } = useJob(id);

  if (isLoading) {
    return (
      <div
        className="container"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - var(--navbar-h))',
          paddingTop: 'var(--navbar-h)',
        }}
      >
        <Spinner size={36} />
      </div>
    );
  }

  if (isError || !data?.job) {
    return (
      <div
        className="container"
        style={{
          padding: 'var(--space-12) var(--space-6)',
          maxWidth: '600px',
        }}
      >
        <EmptyState
          icon={Briefcase}
          title="Job listing not found"
          description="The position you are looking for might have been closed, deleted, or is no longer available."
          action={
            <Link to="/jobs" style={{ textDecoration: 'none' }}>
              <Button variant="primary">Browse All Jobs</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="container"
      style={{
        maxWidth: '900px',
        padding: 'var(--space-6) var(--space-4)',
      }}
    >
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Link
          to="/jobs"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--accent-hover)',
            fontSize: 'var(--text-sm)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to All Jobs</span>
        </Link>
      </div>

      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
        }}
      >
        <JobDetail job={data.job} />
      </div>
    </div>
  );
};
