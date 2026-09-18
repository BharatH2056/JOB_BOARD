import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { TagInput } from '../ui/TagInput';

export const JobForm = ({
  initialData = {},
  onSubmit,
  isPending = false,
  isEdit = false,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    role: '',
    location: '',
    description: '',
    salary: '',
    jobType: 'full-time',
    experienceLevel: '',
    skills_required: [],
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData({
        title: initialData.title || '',
        role: initialData.role || '',
        location: initialData.location || '',
        description: initialData.description || '',
        salary: initialData.salary || '',
        jobType: initialData.jobType || 'full-time',
        experienceLevel: initialData.experienceLevel || '',
        skills_required: initialData.skills_required || [],
      });
    }
  }, [initialData]);

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = 'Job title is required';
    if (!formData.role.trim()) errs.role = 'Role is required';
    if (!formData.location.trim()) errs.location = 'Location is required';
    if (!formData.description.trim()) errs.description = 'Job description is required';
    if (!formData.jobType) errs.jobType = 'Job type is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...formData,
      title: formData.title.trim(),
      role: formData.role.trim(),
      location: formData.location.trim(),
      description: formData.description.trim(),
      salary: formData.salary ? formData.salary.trim() : null,
      experienceLevel: formData.experienceLevel ? formData.experienceLevel.trim() : null,
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="job-title">Job Title *</label>
          <input
            id="job-title"
            type="text"
            placeholder="e.g. Senior Frontend Engineer"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          {errors.title && <span className="field-error">{errors.title}</span>}
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="job-role">Role Discipline *</label>
          <input
            id="job-role"
            type="text"
            placeholder="e.g. Engineering, Product, Design"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          />
          {errors.role && <span className="field-error">{errors.role}</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="job-location">Location *</label>
          <input
            id="job-location"
            type="text"
            placeholder="e.g. Remote, San Francisco, London"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
          {errors.location && <span className="field-error">{errors.location}</span>}
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="job-type">Job Type *</label>
          <select
            id="job-type"
            value={formData.jobType}
            onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
          >
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="internship">Internship</option>
            <option value="remote">Remote</option>
          </select>
          {errors.jobType && <span className="field-error">{errors.jobType}</span>}
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="job-exp">Experience Level</label>
          <select
            id="job-exp"
            value={formData.experienceLevel}
            onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
          >
            <option value="">Any Level</option>
            <option value="Junior">Junior</option>
            <option value="Mid">Mid</option>
            <option value="Senior">Senior</option>
            <option value="Lead">Lead</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="job-salary">Compensation / Salary (Optional)</label>
          <input
            id="job-salary"
            type="text"
            placeholder="e.g. $130,000 - $160,000"
            value={formData.salary}
            onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
          />
        </div>
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label htmlFor="job-skills">Required Skills & Technologies (Optional)</label>
        <TagInput
          tags={formData.skills_required}
          onChange={(newSkills) => setFormData({ ...formData, skills_required: newSkills })}
          placeholder="Type skill and press Enter (e.g. React, Node.js, AWS)..."
        />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
          Tip: If omitted, our backend AI will automatically parse skills from your description.
        </span>
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label htmlFor="job-desc">Job Description *</label>
        <textarea
          id="job-desc"
          rows={8}
          placeholder="Detailed role description, responsibilities, requirements, benefits..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        {errors.description && <span className="field-error">{errors.description}</span>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
        <Button type="submit" variant="primary" size="lg" loading={isPending}>
          {isEdit ? 'Save Changes' : 'Publish Job Listing'}
        </Button>
      </div>
    </form>
  );
};
