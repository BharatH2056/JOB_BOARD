import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEmployerJobs, useDeleteJob, useCloseJob } from '../../hooks/useEmployerJobs';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Briefcase,
  PlusCircle,
  Users,
  Edit,
  Trash2,
  Lock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const JobList = () => {
  const { data, isLoading } = useEmployerJobs();
  const { mutate: deleteJobMutation, isPending: isDeleting } = useDeleteJob();
  const { mutate: closeJobMutation, isPending: isClosing } = useCloseJob();
  const { success, error } = useToast();

  const [deleteModalJob, setDeleteModalJob] = useState(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  const jobs = data?.jobs || [];

  const handleCloseJob = (job) => {
    closeJobMutation(job._id, {
      onSuccess: () => {
        success(`"${job.title}" has been closed.`);
      },
      onError: (err) => {
        error(err.response?.data?.message || 'Failed to close job.');
      },
    });
  };

  const confirmDelete = () => {
    if (!deleteModalJob) return;
    setDeleteErrorMsg('');

    deleteJobMutation(deleteModalJob._id, {
      onSuccess: () => {
        success(`"${deleteModalJob.title}" was permanently deleted.`);
        setDeleteModalJob(null);
      },
      onError: (err) => {
        // If 403 due to hasApplications: true
        if (err.response?.status === 403) {
          setDeleteErrorMsg(
            'This job already has submitted applications and cannot be deleted. Please use "Close Listing" instead to deactivate it.'
          );
        } else {
          setDeleteErrorMsg(err.response?.data?.message || 'Failed to delete listing.');
        }
      },
    });
  };

  return (
    <div className="container" style={{ maxWidth: '1080px', padding: 'var(--space-8) var(--space-4)' }}>
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
            My Job Listings
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Manage your published vacancies, edit details, or review candidates
          </p>
        </div>

        <Link to="/employer/jobs/new" style={{ textDecoration: 'none' }}>
          <Button variant="primary">
            <PlusCircle size={16} />
            <span>Post a Job</span>
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: 'var(--space-6)', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)' }}>
              <Skeleton width="50%" height="24px" style={{ marginBottom: '8px' }} />
              <Skeleton width="30%" height="16px" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No job listings found"
          description="You haven't posted any positions yet. Publish a job to start attracting candidates."
          action={
            <Link to="/employer/jobs/new" style={{ textDecoration: 'none' }}>
              <Button variant="primary">Create First Job Listing</Button>
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {jobs.map((job) => (
            <div
              key={job._id}
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
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
                      {job.title}
                    </h3>
                    {job.status === 'open' ? (
                      <Badge variant="green">Open</Badge>
                    ) : (
                      <Badge variant="red">Closed</Badge>
                    )}
                    {job.hasApplications && (
                      <Badge variant="blue">Has Applicants</Badge>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    <span>{job.role}</span>
                    <span>•</span>
                    <span>{job.location}</span>
                    <span>•</span>
                    <span>{job.jobType}</span>
                    {job.salary && (
                      <>
                        <span>•</span>
                        <span>{job.salary}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Applications link button */}
                <Link to={`/employer/jobs/${job._id}/applications`} style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" size="sm" style={{ gap: '6px' }}>
                    <Users size={15} />
                    <span>View Applicants</span>
                  </Button>
                </Link>
              </div>

              {/* Action Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border)',
                  paddingTop: 'var(--space-4)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link to={`/jobs/${job._id}`} target="_blank" style={{ textDecoration: 'none' }}>
                    <Button variant="ghost" size="sm" style={{ gap: '4px' }}>
                      <ExternalLink size={14} />
                      <span>Preview Public Page</span>
                    </Button>
                  </Link>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Edit - disabled if hasApplications per backend rules */}
                  <Link to={`/employer/jobs/${job._id}/edit`} style={{ textDecoration: 'none' }}>
                    <Button variant="secondary" size="sm" disabled={job.hasApplications} title={job.hasApplications ? 'Cannot edit job with active applications' : 'Edit job'}>
                      <Edit size={14} />
                      <span>Edit</span>
                    </Button>
                  </Link>

                  {/* Soft Close */}
                  {job.status === 'open' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCloseJob(job)}
                      disabled={isClosing}
                      style={{ color: 'var(--yellow)', borderColor: 'rgba(251, 191, 36, 0.3)' }}
                    >
                      <Lock size={14} />
                      <span>Close Listing</span>
                    </Button>
                  )}

                  {/* Hard Delete */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setDeleteModalJob(job);
                      setDeleteErrorMsg('');
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalJob && (
        <Modal
          isOpen={!!deleteModalJob}
          onClose={() => setDeleteModalJob(null)}
          title="Confirm Job Deletion"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {deleteErrorMsg ? (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--red-bg)',
                  border: '1px solid rgba(248, 113, 113, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--red)',
                  fontSize: 'var(--text-sm)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{deleteErrorMsg}</span>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete{' '}
                <strong style={{ color: 'var(--text-primary)' }}>"{deleteModalJob.title}"</strong>?
                This action cannot be undone.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button variant="secondary" onClick={() => setDeleteModalJob(null)}>
                Cancel
              </Button>
              {!deleteErrorMsg && (
                <Button variant="destructive-solid" loading={isDeleting} onClick={confirmDelete}>
                  Delete Permanently
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
