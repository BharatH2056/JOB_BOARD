import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUpdateProfile } from '../../hooks/useProfile';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { TagInput } from '../../components/ui/TagInput';
import { User, Upload, FileCheck, Link as LinkIcon } from 'lucide-react';

export const Profile = () => {
  const { user } = useAuth();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    skills: [],
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [existingResumeUrl, setExistingResumeUrl] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        skills: user.skills || [],
      });
      setExistingResumeUrl(user.resumeUrl || '');
    }
  }, [user]);

  const handleFileChange = (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      error('Only PDF files are allowed');
      return;
    }
    setResumeFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      error('Full name is required');
      return;
    }

    if (resumeFile && resumeFile.type !== 'application/pdf') {
      error('Only PDF files are allowed');
      return;
    }

    updateProfile(
      {
        name: formData.name.trim(),
        bio: formData.bio.trim(),
        skills: formData.skills,
        resumeFile,
      },
      {
        onSuccess: () => {
          success('Profile updated successfully!');
          setResumeFile(null);
        },
        onError: (err) => {
          error(err.response?.data?.message || 'Failed to update profile.');
        },
      }
    );
  };

  const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  const resumeHref = existingResumeUrl
    ? existingResumeUrl.startsWith('http')
      ? existingResumeUrl
      : `${apiBase}${existingResumeUrl.startsWith('/') ? '' : '/'}${existingResumeUrl}`
    : '';

  return (
    <div className="container" style={{ maxWidth: '680px', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-1)' }}>
          Candidate Profile
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Keep your skills and bio up to date to power accurate AI skill-gap matching
        </p>
      </div>

      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-8)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="prof-name">Full Name</label>
            <div style={{ position: 'relative' }}>
              <input
                id="prof-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ paddingLeft: '36px' }}
              />
              <User
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="prof-email">Email Address</label>
            <input
              id="prof-email"
              type="email"
              disabled
              value={user?.email || ''}
              style={{ opacity: 0.6 }}
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
              Email address is linked to your authentication credentials.
            </span>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="prof-skills">Skills & Expertise</label>
            <TagInput
              tags={formData.skills}
              onChange={(newSkills) => setFormData({ ...formData, skills: newSkills })}
              placeholder="Add skills (e.g. React, Python, Docker) and press Enter..."
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
              These skills are compared directly against employer job descriptions for real-time skill-gap insights.
            </span>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="resume-file">Resume (PDF, Optional)</label>

            {existingResumeUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: 'var(--text-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Current resume:</span>
                <a
                  href={resumeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--accent-hover)',
                    textDecoration: 'none',
                    fontWeight: 'var(--weight-medium)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  <LinkIcon size={13} />
                  <span>View current resume</span>
                </a>
              </div>
            )}

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
                accept="application/pdf"
                onChange={(e) => handleFileChange(e.target.files[0])}
                style={{ display: 'none' }}
              />
              {resumeFile ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--green)' }}>
                  <FileCheck size={20} />
                  <span style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>
                    {resumeFile.name}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <Upload size={24} color="var(--text-muted)" />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    Click to select your resume (PDF only)
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    PDF up to 10MB
                  </span>
                </div>
              )}
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
              Upload your default resume in PDF format to auto-attach when applying for jobs.
            </span>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="prof-bio">Short Professional Bio</label>
            <textarea
              id="prof-bio"
              rows={4}
              placeholder="Tell employers about your background, years of experience, and primary areas of interest..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button type="submit" variant="primary" size="lg" loading={isPending}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
