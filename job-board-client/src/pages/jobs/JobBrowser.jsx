import React, { useState, useEffect } from 'react';
import { useJobs } from '../../hooks/useJobs';
import { useJobSearch } from '../../hooks/useJobSearch';
import { JobCard } from '../../components/jobs/JobCard';
import { JobDetail } from '../../components/jobs/JobDetail';
import { JobFilters } from '../../components/jobs/JobFilters';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Sparkles,
  SlidersHorizontal,
  Briefcase,
  X,
} from 'lucide-react';

const PAGE_SIZE = 10;

export const JobBrowser = () => {
  // Search Mode: 'filter' | 'semantic'
  const [searchMode, setSearchMode] = useState('filter');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Standard filter state
  const [filters, setFilters] = useState({
    role: '',
    location: '',
    jobType: '',
    experienceLevel: '',
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Reset page when searchMode changes away from 'filter'
  useEffect(() => {
    if (searchMode !== 'filter') {
      setCurrentPage(1);
    }
  }, [searchMode]);

  // Query inputs
  const [semanticQuery, setSemanticQuery] = useState('');

  // Search results from semantic search
  const [searchResults, setSearchResults] = useState(null);

  // Selected job for right detail panel
  const [selectedJobId, setSelectedJobId] = useState(null);

  // Mobile view state (below 900px, show detail only when a job is picked)
  const [mobileDetailActive, setMobileDetailActive] = useState(false);

  // React Query hooks
  const { data: standardData, isLoading: isStandardLoading, refetch: refetchStandard } = useJobs(
    searchMode === 'filter' ? { ...filters, page: currentPage, limit: PAGE_SIZE } : {},
    { enabled: searchMode === 'filter' }
  );
  const { mutate: runSemanticSearch, isPending: isSemanticLoading } = useJobSearch();

  const handleSemanticSubmit = (e) => {
    e.preventDefault();
    if (!semanticQuery.trim()) return;
    runSemanticSearch(
      semanticQuery.trim(),
      {
        onSuccess: (data) => {
          setSearchResults(data.jobs || []);
          if (data.jobs?.length > 0) {
            setSelectedJobId(data.jobs[0]._id);
          } else {
            setSelectedJobId(null);
          }
        },
      }
    );
  };

  const clearSearch = () => {
    setSearchResults(null);
    setSemanticQuery('');
    if (searchMode !== 'filter') {
      setSearchMode('filter');
    }
  };

  // Determine which list of jobs to display
  const jobsList =
    searchMode === 'filter'
      ? standardData?.jobs || []
      : searchResults || [];
  const isLoading = searchMode === 'filter' ? isStandardLoading : isSemanticLoading;
  const hasSearched = searchMode === 'filter' || searchResults !== null;

  // Sync selected job if list changes and none selected
  useEffect(() => {
    if (jobsList.length > 0 && !selectedJobId) {
      setSelectedJobId(jobsList[0]._id);
    }
  }, [jobsList, selectedJobId]);

  const selectedJob = jobsList.find((j) => j._id === selectedJobId) || null;

  const handleSelectJob = (job) => {
    setSelectedJobId(job._id);
    setMobileDetailActive(true);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - var(--navbar-h))',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      {/* Top Search Controls Bar */}
      <div
        style={{
          backgroundColor: 'var(--bg-raised)',
          borderBottom: '1px solid var(--border)',
          padding: 'var(--space-3) var(--space-6)',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Mode Selector Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '3px',
                gap: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setSearchMode('filter');
                  setSearchResults(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-medium)',
                  backgroundColor: searchMode === 'filter' ? 'var(--bg-elevated)' : 'transparent',
                  color: searchMode === 'filter' ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <SlidersHorizontal size={13} />
                <span>Standard Browse</span>
              </button>

              <button
                type="button"
                onClick={() => setSearchMode('semantic')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-medium)',
                  backgroundColor: searchMode === 'semantic' ? 'var(--accent-muted)' : 'transparent',
                  color: searchMode === 'semantic' ? 'var(--accent-hover)' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Sparkles size={13} />
                <span>AI Semantic Search</span>
              </button>
            </div>

            {searchResults !== null && (
              <button
                type="button"
                onClick={clearSearch}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-hover)',
                  fontSize: 'var(--text-xs)',
                  cursor: 'pointer',
                }}
              >
                <X size={13} />
                <span>Clear AI Results ({jobsList.length} found)</span>
              </button>
            )}
          </div>

          {/* Dynamic Search Input according to mode */}
          {searchMode === 'semantic' && (
            <form onSubmit={handleSemanticSubmit} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder="Describe your ideal role (e.g. 'React developer building AI pipelines with modern frontend tooling')..."
                  value={semanticQuery}
                  onChange={(e) => setSemanticQuery(e.target.value)}
                  style={{ paddingLeft: '36px', height: '40px' }}
                />
                <Sparkles
                  size={16}
                  color="var(--accent-hover)"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
              <Button type="submit" variant="primary" loading={isSemanticLoading}>
                <span>Search</span>
              </Button>
            </form>
          )}

          {/* Standard Filters Bar */}
          {searchMode === 'filter' && (
            <JobFilters
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters({ role: '', location: '', jobType: '', experienceLevel: '' })}
            />
          )}
        </div>
      </div>

      {/* Main Split-View Workspace */}
      <div
        className="split-workspace"
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 420px) 1fr',
          overflow: 'hidden',
          maxWidth: 'var(--content-max)',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Left Column: Job Cards List */}
        <div
          className={`job-list-col ${mobileDetailActive ? 'mobile-hidden' : ''}`}
          style={{
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isLoading
                ? 'Searching...'
                : `${searchMode === 'filter' && standardData?.total !== undefined ? standardData.total : jobsList.length} Opportunities`}
            </span>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} style={{ padding: 'var(--space-4)', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)' }}>
                  <Skeleton width="65%" height="18px" style={{ marginBottom: '8px' }} />
                  <Skeleton width="40%" height="14px" style={{ marginBottom: '14px' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Skeleton width="60px" height="20px" />
                    <Skeleton width="70px" height="20px" />
                  </div>
                </div>
              ))}
            </div>
          ) : jobsList.length === 0 ? (
            !hasSearched ? (
              <EmptyState
                icon={Sparkles}
                title="Describe what you're looking for"
                description="Type a role, skills, or a sentence about your ideal job above and hit Search."
              />
            ) : (
              <EmptyState
                icon={Briefcase}
                title="No matching opportunities"
                description="Try adjusting your filters or using semantic search to discover more positions."
                action={
                  searchMode !== 'filter' ? (
                    <Button variant="secondary" size="sm" onClick={clearSearch}>
                      Reset Search
                    </Button>
                  ) : null
                }
              />
            )
          ) : (
            <>
              {jobsList.map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  isSelected={job._id === selectedJobId}
                  onClick={() => handleSelectJob(job)}
                />
              ))}

              {searchMode === 'filter' && standardData?.totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: 'var(--space-3) var(--space-2)',
                    marginTop: 'var(--space-2)',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setSelectedJobId(null);
                      setCurrentPage((p) => p - 1);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 14px',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--weight-medium)',
                      backgroundColor: 'var(--bg-surface)',
                      color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1,
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    Previous
                  </button>

                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--weight-medium)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Page {currentPage} of {standardData.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage === standardData.totalPages}
                    onClick={() => {
                      setSelectedJobId(null);
                      setCurrentPage((p) => p + 1);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 14px',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--weight-medium)',
                      backgroundColor: 'var(--bg-surface)',
                      color: currentPage === standardData.totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: currentPage === standardData.totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === standardData.totalPages ? 0.5 : 1,
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column: Job Detail Panel */}
        <div
          className={`job-detail-col ${!mobileDetailActive ? 'mobile-hidden' : ''}`}
          style={{
            backgroundColor: 'var(--bg-base)',
            overflowY: 'auto',
            height: '100%',
          }}
        >
          <JobDetail
            job={selectedJob}
            onBackToList={() => setMobileDetailActive(false)}
            isMobileView={mobileDetailActive}
          />
        </div>
      </div>
    </div>
  );
};
