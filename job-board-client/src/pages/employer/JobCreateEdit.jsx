import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useJob } from '../../hooks/useJobs';
import { useCreateJob, useUpdateJob } from '../../hooks/useEmployerJobs';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { JobForm } from '../../components/employer/JobForm';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export const JobCreateEdit = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  const { data: jobData, isLoading: isLoadingJob } = useJob(id);
  const { mutate: createJobMutation, isPending: isCreating } = useCreateJob();
  const { mutate: updateJobMutation, isPending: isUpdating } = useUpdateJob();

  const isUnverifiedEmployer = !isEdit && user?.role === 'employer' && user?.emailVerified === false;

  const handleSubmit = (formData) => {
    if (isEdit) {
      updateJobMutation(
        { id, data: formData },
        {
          onSuccess: () => {
            success('Job updated successfully!');
            navigate('/employer/jobs');
          },
          onError: (err) => {
            error(err.response?.data?.message || 'Failed to update job.');
          },
        }
      );
    } else {
      createJobMutation(formData, {
        onSuccess: () => {
          success('Job posted successfully!');
          navigate('/employer/jobs');
        },
        onError: (err) => {
          error(err.response?.data?.message || 'Failed to post job.');
        },
      });
    }
  };

  if (isEdit && isLoadingJob) {
    return (
      <div
        className="container"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - var(--navbar-h))',
        }}
      >
        <Spinner size={36} />
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '820px', padding: 'var(--space-8) var(--space-4)' }}>
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
          <span>Back to Listings</span>
        </Link>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginTop: '4px' }}>
          {isEdit ? 'Edit Job Listing' : 'Create a New Opportunity'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          {isEdit
            ? 'Update the details and skill requirements for this position'
            : 'Fill in the role details. Our backend will automatically generate vector embeddings for semantic search.'}
        </p>
      </div>

      {isUnverifiedEmployer ? (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--yellow-bg)',
              color: 'var(--yellow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>
            Email Verification Required
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
              maxWidth: '500px',
              margin: '0 auto var(--space-6)',
              lineHeight: 1.6,
            }}
          >
            To prevent spam and protect job seekers, employers must verify their email before posting new positions. Check your server logs for the token, then click below to verify.
          </p>
          <Link to="/verify-email" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Enter Verification Token</Button>
          </Link>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <JobForm
            initialData={jobData?.job}
            onSubmit={handleSubmit}
            isPending={isCreating || isUpdating}
            isEdit={isEdit}
          />
        </div>
      )}
    </div>
  );
};
