import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useApplyToJob } from '../../hooks/useApplications';
import { useToast } from '../../context/ToastContext';
import { Upload, Link as LinkIcon, FileCheck } from 'lucide-react';

export const ApplyModal = ({ isOpen, onClose, job }) => {
  const [resumeMode, setResumeMode] = useState('file'); // 'file' | 'url'
  const [file, setFile] = useState(null);
  const [resumeUrl, setResumeUrl] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');

  const { mutate: apply, isPending } = useApplyToJob();
  const { success, error } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (resumeMode === 'file' && !file && !resumeUrl) {
      error('Please select a resume file or enter a resume URL');
      return;
    }

    if (resumeMode === 'url' && !resumeUrl.trim()) {
      error('Please enter a valid resume URL');
      return;
    }

    const formAnswers = {
      coverNote: coverNote.trim(),
      yearsExperience: yearsExperience.trim(),
    };

    let data;
    if (resumeMode === 'file' && file) {
      data = new FormData();
      data.append('resume', file);
      data.append('formAnswers', JSON.stringify(formAnswers));
    } else {
      data = {
        resumeUrl: resumeUrl.trim(),
        formAnswers,
      };
    }

    apply(
      { jobId: job._id, data },
      {
        onSuccess: () => {
          success(`Application submitted for ${job.title}!`);
          onClose();
          setFile(null);
          setResumeUrl('');
          setCoverNote('');
          setYearsExperience('');
        },
        onError: (err) => {
          error(err.response?.data?.message || 'Failed to submit application.');
        },
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Apply to ${job?.title}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ marginBottom: '8px' }}>Resume Submission Method</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              type="button"
              variant={resumeMode === 'file' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setResumeMode('file')}
              style={{ flex: 1 }}
            >
              <Upload size={15} />
              <span>Upload Document</span>
            </Button>
            <Button
              type="button"
              variant={resumeMode === 'url' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setResumeMode('url')}
              style={{ flex: 1 }}
            >
              <LinkIcon size={15} />
              <span>Resume URL</span>
            </Button>
          </div>
        </div>

        {resumeMode === 'file' ? (
          <div className="form-group">
            <label htmlFor="resume-file">Resume File (.pdf, .doc, .docx)</label>
            <div
              style={{
                border: '1px dashed var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-6)',
                textAlign: 'center',
                backgroundColor: 'var(--bg-elevated)',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('resume-file').click()}
            >
              <input
                id="resume-file"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--green)' }}>
                  <FileCheck size={20} />
                  <span style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>
                    {file.name}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <Upload size={24} color="var(--text-muted)" />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    Click to select resume from your device
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    PDF, DOC, DOCX up to 5MB
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="resume-url">Public Resume Link</label>
            <input
              id="resume-url"
              type="url"
              placeholder="https://example.com/my-resume.pdf or LinkedIn profile"
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
              required={resumeMode === 'url'}
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="years-exp">Years of Relevant Experience (Optional)</label>
          <input
            id="years-exp"
            type="text"
            placeholder="e.g. 4 years in React & TypeScript"
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="cover-note">Note to the Employer (Optional)</label>
          <textarea
            id="cover-note"
            rows={3}
            placeholder="Briefly describe why your experience makes you a strong fit for this position..."
            value={coverNote}
            onChange={(e) => setCoverNote(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isPending}>
            Submit Application
          </Button>
        </div>
      </form>
    </Modal>
  );
};
