import React, { useState } from 'react';
import { useAdminJobs, useAdminDeleteJob, useAdminUsers, useSetBanStatus } from '../../hooks/useAdmin';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Shield,
  Briefcase,
  Users,
  Trash2,
  Ban,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' | 'users'

  // Admin query hooks
  const { data: jobsData, isLoading: isLoadingJobs } = useAdminJobs();
  const { data: usersData, isLoading: isLoadingUsers } = useAdminUsers();

  // Admin mutation hooks
  const { mutate: deleteJobMutation, isPending: isDeletingJob } = useAdminDeleteJob();
  const { mutate: setBanStatusMutation, isPending: isBanning } = useSetBanStatus();
  const { success, error } = useToast();

  const [deleteModalJob, setDeleteModalJob] = useState(null);

  const jobs = jobsData?.jobs || [];
  const users = usersData?.users || [];

  const handleForceDeleteJob = () => {
    if (!deleteModalJob) return;
    deleteJobMutation(deleteModalJob._id, {
      onSuccess: () => {
        success(`Job "${deleteModalJob.title}" force-deleted by admin.`);
        setDeleteModalJob(null);
      },
      onError: (err) => {
        error(err.response?.data?.message || 'Failed to delete job.');
      },
    });
  };

  const handleToggleBan = (targetUser) => {
    const nextBanState = !targetUser.isBanned;
    setBanStatusMutation(
      { id: targetUser._id, isBanned: nextBanState },
      {
        onSuccess: () => {
          success(`User ${targetUser.name} has been ${nextBanState ? 'banned' : 'unbanned'}.`);
        },
        onError: (err) => {
          error(err.response?.data?.message || 'Failed to update user ban status.');
        },
      }
    );
  };

  return (
    <div className="container" style={{ maxWidth: '1180px', padding: 'var(--space-8) var(--space-4)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-1)' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--red-bg)',
              color: 'var(--red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={18} />
          </div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Platform Administration</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          System-level moderation, platform-wide job audit, and account restriction controls
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('jobs')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-semibold)',
            backgroundColor: 'transparent',
            color: activeTab === 'jobs' ? 'var(--accent-hover)' : 'var(--text-muted)',
            border: 'none',
            borderBottom: `2px solid ${activeTab === 'jobs' ? 'var(--accent)' : 'transparent'}`,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          <Briefcase size={16} />
          <span>All Job Listings ({jobs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-semibold)',
            backgroundColor: 'transparent',
            color: activeTab === 'users' ? 'var(--accent-hover)' : 'var(--text-muted)',
            border: 'none',
            borderBottom: `2px solid ${activeTab === 'users' ? 'var(--accent)' : 'transparent'}`,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          <Users size={16} />
          <span>Registered Users ({users.length})</span>
        </button>
      </div>

      {/* Jobs Tab Content */}
      {activeTab === 'jobs' && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
          }}
        >
          {isLoadingJobs ? (
            <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Skeleton height="36px" />
              <Skeleton height="36px" />
              <Skeleton height="36px" />
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState icon={Briefcase} title="No jobs listed" description="There are no jobs on the platform." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px' }}>Title & Location</th>
                    <th style={{ padding: '12px 16px' }}>Employer ID</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Applicants</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job._id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>
                          {job.title}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {job.location} • {job.role}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {job.employerId?._id || job.employerId || 'Unknown'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant="muted" size="sm">{job.jobType}</Badge>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {job.status === 'open' ? (
                          <Badge variant="green" size="sm">Open</Badge>
                        ) : (
                          <Badge variant="red" size="sm">Closed</Badge>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {job.hasApplications ? (
                          <Badge variant="blue" size="sm">Yes</Badge>
                        ) : (
                          <Badge variant="muted" size="sm">No</Badge>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteModalJob(job)}
                          style={{ gap: '4px' }}
                        >
                          <Trash2 size={13} />
                          <span>Force Delete</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
          }}
        >
          {isLoadingUsers ? (
            <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Skeleton height="36px" />
              <Skeleton height="36px" />
              <Skeleton height="36px" />
            </div>
          ) : users.length === 0 ? (
            <EmptyState icon={Users} title="No users found" description="There are no registered users in the database." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px' }}>User Name</th>
                    <th style={{ padding: '12px 16px' }}>Email</th>
                    <th style={{ padding: '12px 16px' }}>Role</th>
                    <th style={{ padding: '12px 16px' }}>Verification</th>
                    <th style={{ padding: '12px 16px' }}>Account Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Moderation Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u._id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>
                        {u.name}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant={u.role === 'admin' ? 'red' : u.role === 'employer' ? 'accent' : 'muted'} size="sm">
                          {u.role}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {u.emailVerified ? (
                          <Badge variant="green" size="sm">Verified</Badge>
                        ) : (
                          <Badge variant="yellow" size="sm">Pending</Badge>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {u.isBanned ? (
                          <Badge variant="red" size="sm">Banned</Badge>
                        ) : (
                          <Badge variant="green" size="sm">Active</Badge>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {u.role !== 'admin' && (
                          <Button
                            variant={u.isBanned ? 'outline' : 'destructive'}
                            size="sm"
                            disabled={isBanning}
                            onClick={() => handleToggleBan(u)}
                            style={{ gap: '4px' }}
                          >
                            {u.isBanned ? (
                              <>
                                <CheckCircle size={13} />
                                <span>Unban Account</span>
                              </>
                            ) : (
                              <>
                                <Ban size={13} />
                                <span>Ban User</span>
                              </>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Force Delete Confirmation Modal */}
      {deleteModalJob && (
        <Modal
          isOpen={!!deleteModalJob}
          onClose={() => setDeleteModalJob(null)}
          title="Administrative Force Delete"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
              Are you sure you want to force-delete{' '}
              <strong style={{ color: 'var(--text-primary)' }}>"{deleteModalJob.title}"</strong>?
              As an administrator, this bypasses the standard application constraint and will permanently remove the listing from the database.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button variant="secondary" onClick={() => setDeleteModalJob(null)}>
                Cancel
              </Button>
              <Button variant="destructive-solid" loading={isDeletingJob} onClick={handleForceDeleteJob}>
                Force Delete Now
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
