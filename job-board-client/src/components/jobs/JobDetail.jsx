import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSaveJob, useUnsaveJob, useSavedJobs } from '../../hooks/useSavedJobs';
import { useToast } from '../../context/ToastContext';
import { SkillGap } from './SkillGap';
import { ApplyModal } from './ApplyModal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Bookmark,
  BookmarkCheck,
  Send,
  Sparkles,
  ArrowLeft,
  Share2,
} from 'lucide-react';

export const JobDetail = ({ job, onBackToList, isMobileView = false }) => {
  const { isAuthenticated, isSeeker } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [applyModalOpen, setApplyModalOpen] = useState(false);

  // Saved jobs state
  const { data: savedData } = useSavedJobs(isAuthenticated && isSeeker);
  const { mutate: save, isPending: isSaving } = useSaveJob();
  const { mutate: unsave, isPending: isUnsaving } = useUnsaveJob();

  if (!job) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '300px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          padding: 'var(--space-6)',
        }}
      >
        <Briefcase size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
        <p>Select a job from the list to view complete details</p>
      </div>
    );
  }

  const savedJobIds = (savedData?.jobs || []).map((j) => j._id);
  const isSaved = savedJobIds.includes(job._id);

  const handleToggleSave = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isSaved) {
      unsave(job._id, {
        onSuccess: () => success('Job removed from saved list'),
        onError: (err) => error(err.response?.data?.message || 'Failed to remove job'),
      });
    } else {
      save(job._id, {
        onSuccess: () => success('Job saved to your bookmarks'),
        onError: (err) => error(err.response?.data?.message || 'Failed to save job'),
      });
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/jobs/${job._id}`;
    navigator.clipboard.writeText(url);
    success('Job link copied to clipboard!');
  };

  const matchPercent = job.score ? Math.round(job.score * 100) : null;
  const isClosed = job.status === 'closed';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: isMobileView ? 'var(--space-4)' : 'var(--space-6)',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {/* Mobile Back Button */}
      {isMobileView && onBackToList && (
        <button
          type="button"
          onClick={onBackToList}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: 'none',
            color: 'var(--accent-hover)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-medium)',
            cursor: 'pointer',
            padding: '4px 0',
            width: 'fit-content',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to all jobs</span>
        </button>
      )}

      {/* Header Info */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: 'var(--space-6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h2
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--weight-bold)',
                color: 'var(--text-primary)',
                marginBottom: '6px',
              }}
            >
              {job.title}
            </h2>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              {job.role}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              title="Copy share link"
              style={{ padding: '8px' }}
            >
              <Share2 size={16} />
            </Button>

            {isSeeker && (
              <Button
                variant={isSaved ? 'outline' : 'secondary'}
                size="sm"
                onClick={handleToggleSave}
                disabled={isSaving || isUnsaving}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck size={16} color="var(--accent-hover)" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Bookmark size={16} />
                    <span>Save</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Metadata badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={15} color="var(--text-secondary)" />
            <span>{job.location}</span>
          </div>
          {job.salary && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={15} color="var(--text-secondary)" />
              <span>{job.salary}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} color="var(--text-secondary)" />
            <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Badge variant="accent">{job.jobType}</Badge>
          {job.experienceLevel && <Badge variant="muted">{job.experienceLevel}</Badge>}
          {isClosed ? (
            <Badge variant="red">Closed</Badge>
          ) : (
            <Badge variant="green">Active Listing</Badge>
          )}
          {matchPercent !== null && (
            <Badge variant="accent" style={{ gap: '4px' }}>
              <Sparkles size={12} />
              <span>{matchPercent}% Match</span>
            </Badge>
          )}
        </div>

        {/* Apply CTA Bar */}
        <div style={{ marginTop: '8px' }}>
          {!isAuthenticated ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/login', { state: { from: `/jobs/${job._id}` } })}
            >
              Sign in to Apply
            </Button>
          ) : isSeeker ? (
            <Button
              variant="primary"
              size="md"
              disabled={isClosed}
              onClick={() => setApplyModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Send size={16} />
              <span>{isClosed ? 'Listing Closed' : 'Apply Now'}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Semantic Match Explanation */}
      {job.matchExplanation && (
        <div
          style={{
            padding: 'var(--space-4)',
            backgroundColor: 'var(--accent-muted)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--accent-hover)', fontWeight: 'var(--weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Sparkles size={14} />
            <span>AI Match Explanation</span>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 'var(--leading-normal)' }}>
            {job.matchExplanation}
          </p>
        </div>
      )}

      {/* Seeker Skill Gap Section */}
      {isAuthenticated && isSeeker && <SkillGap jobId={job._id} />}

      {/* Required Skills */}
      {job.skills_required && job.skills_required.length > 0 && (
        <div>
          <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Required Skills & Technologies
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {job.skills_required.map((skill, index) => (
              <Badge key={index} variant="muted" size="md">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Full Description */}
      <div>
        <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Job Description
        </h4>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-primary)',
            lineHeight: 'var(--leading-loose)',
            whiteSpace: 'pre-wrap',
            backgroundColor: 'var(--bg-surface)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
          }}
        >
          {job.description}
        </div>
      </div>

      {/* Apply Modal */}
      {applyModalOpen && (
        <ApplyModal
          isOpen={applyModalOpen}
          onClose={() => setApplyModalOpen(false)}
          job={job}
        />
      )}
    </div>
  );
};
