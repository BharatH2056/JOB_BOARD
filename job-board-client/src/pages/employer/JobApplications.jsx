import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useJob } from '../../hooks/useJobs';
import { useJobApplications, useUpdateApplicationStatus } from '../../hooks/useEmployerJobs';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Users,
  ArrowLeft,
  Mail,
  ExternalLink,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

export const JobApplications = () => {
  const { id } = useParams();
  const { data: jobData } = useJob(id);
  const { data: appsData, isLoading } = useJobApplications(id);
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateApplicationStatus();
  const { success, error } = useToast();

  const applications = appsData?.applications || [];
  const jobTitle = jobData?.job?.title || 'Job Applications';

  const handleStatusChange = (applicationId, newStatus) => {
    updateStatus(
      { applicationId, status: newStatus },
      {
        onSuccess: () => success(`Candidate status set to "${newStatus}"`),
        onError: (err) => error(err.response?.data?.message || 'Failed to update status'),
      }
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'reviewed':
        return <Badge variant="blue">Reviewed</Badge>;
      case 'rejected':
        return <Badge variant="red">Rejected</Badge>;
      case 'applied':
      default:
        return <Badge variant="yellow">Applied</Badge>;
    }
  };

  return (
    <div className="container" style={{ maxWidth: '1080px', padding: 'var(--space-8) var(--space-4)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link
          to="/employer/jobs"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--accent-hover)',
            fontSize: 'var(--text-sm)',
            textDecoration: 'none',
            marginBottom: 'var(--space-2)',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Job Listings</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)' }}>
              Applicants: {jobTitle}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              Review submitted candidate credentials, attached resumes, and update hiring stage
            </p>
          </div>
          <Badge variant="accent" size="lg">
            {applications.length} {applications.length === 1 ? 'Applicant' : 'Applicants'}
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: 'var(--space-6)', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)' }}>
              <Skeleton width="40%" height="20px" style={{ marginBottom: '8px' }} />
              <Skeleton width="60%" height="16px" />
            </div>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No applications received yet"
          description="Candidates who apply to this role will appear here with their resumes and qualifications."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {applications.map((app) => {
            const seeker = app.seekerId || {};
            const appliedDate = app.appliedAt || app.createdAt;

            // Form answers parsing
            let formAnswers = app.formAnswers || {};
            if (typeof formAnswers === 'string') {
              try { formAnswers = JSON.parse(formAnswers); } catch { /* ignore */ }
            }

            return (
              <div
                key={app._id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-6)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* Candidate row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
                        {seeker.name || 'Candidate Name'}
                      </h3>
                      {getStatusBadge(app.status)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {seeker.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={13} />
                          <span>{seeker.email}</span>
                        </div>
                      )}
                      {appliedDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} />
                          <span>Submitted {new Date(appliedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Dropdown/Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Status:</span>
                    <select
                      value={app.status || 'applied'}
                      disabled={isUpdatingStatus}
                      onChange={(e) => handleStatusChange(app._id, e.target.value)}
                      style={{
                        padding: '6px 12px',
                        fontSize: 'var(--text-xs)',
                        width: 'auto',
                        minWidth: '120px',
                      }}
                    >
                      <option value="applied">Applied</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Candidate bio / skills if available */}
                {seeker.bio && (
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    "{seeker.bio}"
                  </div>
                )}

                {seeker.skills && seeker.skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {seeker.skills.map((skill, idx) => (
                      <Badge key={idx} variant="muted" size="sm">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Questionnaire / Notes */}
                {Object.keys(formAnswers).length > 0 && (
                  <div
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3) var(--space-4)',
                      fontSize: 'var(--text-xs)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {formAnswers.coverNote && (
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>Applicant Note:</strong>{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>{formAnswers.coverNote}</span>
                      </div>
                    )}
                    {formAnswers.yearsExperience && (
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>Experience:</strong>{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>{formAnswers.yearsExperience}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Resume Download/Link */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
                  {app.resumeUrl ? (
                    <a
                      href={app.resumeUrl.startsWith('http') ? app.resumeUrl : `http://localhost:5000/${app.resumeUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--accent-hover)',
                        fontWeight: 'var(--weight-medium)',
                      }}
                    >
                      <ExternalLink size={14} />
                      <span>Download / Open Attached Resume</span>
                    </a>
                  ) : (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      No resume file attached
                    </span>
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
