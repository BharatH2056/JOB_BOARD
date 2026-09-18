import React from 'react';
import { Link } from 'react-router-dom';
import { useEmployerDashboard } from '../../hooks/useEmployerJobs';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Briefcase,
  Eye,
  Users,
  Bookmark,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const { data, isLoading } = useEmployerDashboard();

  const jobs = data?.jobs || [];
  const isUnverified = user?.emailVerified === false;

  // Calculate totals
  const totalViews = jobs.reduce((acc, j) => acc + (j.viewCount || 0), 0);
  const totalApplicants = jobs.reduce((acc, j) => acc + (j.applicantCount || 0), 0);
  const totalSaves = jobs.reduce((acc, j) => acc + (j.saveCount || 0), 0);

  return (
    <div className="container" style={{ maxWidth: '1080px', padding: 'var(--space-8) var(--space-4)' }}>
      {/* Verification Warning Banner if unverified */}
      {isUnverified && (
        <div
          style={{
            backgroundColor: 'var(--yellow-bg)',
            border: '1px solid rgba(251, 191, 36, 0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4) var(--space-6)',
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={24} color="var(--yellow)" />
            <div>
              <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                Account Verification Required
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Job posting is restricted until email verification is confirmed. (Link printed in server terminal).
              </div>
            </div>
          </div>
          <Link to="/verify-email" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm" style={{ borderColor: 'var(--yellow)', color: 'var(--yellow)' }}>
              Enter Verification Token
            </Button>
          </Link>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: 'var(--space-8)',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-1)' }}>
            Employer Overview
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Real-time analytics and applicant engagement for your active roles
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/employer/jobs" style={{ textDecoration: 'none' }}>
            <Button variant="secondary">
              Manage Listings
            </Button>
          </Link>
          <Link to="/employer/jobs/new" style={{ textDecoration: 'none' }}>
            <Button variant="primary">
              <PlusCircle size={16} />
              <span>Post New Job</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: 'var(--space-8)',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}>Total Active Listings</span>
            <Briefcase size={16} />
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)' }}>
            {isLoading ? <Skeleton width="50px" height="30px" /> : jobs.filter((j) => j.status === 'open').length}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            {jobs.length} total posts created
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}>Total Job Views</span>
            <Eye size={16} />
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: 'var(--blue)' }}>
            {isLoading ? <Skeleton width="50px" height="30px" /> : totalViews}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Unique candidate impressions
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}>Total Applicants</span>
            <Users size={16} />
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: 'var(--green)' }}>
            {isLoading ? <Skeleton width="50px" height="30px" /> : totalApplicants}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Submissions across all roles
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}>Candidate Bookmarks</span>
            <Bookmark size={16} />
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: 'var(--accent-hover)' }}>
            {isLoading ? <Skeleton width="50px" height="30px" /> : totalSaves}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Saved by interested seekers
          </div>
        </div>
      </div>

      {/* Metrics Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)' }}>
            Performance by Listing
          </h3>
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Skeleton height="36px" />
            <Skeleton height="36px" />
            <Skeleton height="36px" />
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No job performance data yet"
            description="Create your first job listing to start receiving views, candidate bookmarks, and applications."
            action={
              <Link to="/employer/jobs/new" style={{ textDecoration: 'none' }}>
                <Button variant="primary">Create Job Listing</Button>
              </Link>
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 'var(--weight-medium)' }}>Job Title</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'var(--weight-medium)' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'var(--weight-medium)' }}>Views</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'var(--weight-medium)' }}>Saves</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'var(--weight-medium)' }}>Applicants</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'var(--weight-medium)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job._id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>
                        {job.title}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {job.location}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {job.status === 'open' ? (
                        <Badge variant="green" size="sm">Active</Badge>
                      ) : (
                        <Badge variant="red" size="sm">Closed</Badge>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {job.viewCount || 0}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {job.saveCount || 0}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        to={`/employer/jobs/${job._id}/applications`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'var(--accent-hover)',
                          fontWeight: 'var(--weight-semibold)',
                        }}
                      >
                        <span>{job.applicantCount || 0}</span>
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Link to={`/employer/jobs/${job._id}/applications`} style={{ textDecoration: 'none', marginRight: '8px' }}>
                        <Button variant="secondary" size="sm">
                          Applicants
                        </Button>
                      </Link>
                      <Link to={`/employer/jobs/${job._id}/edit`} style={{ textDecoration: 'none' }}>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
