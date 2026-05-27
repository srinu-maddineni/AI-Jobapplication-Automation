import { useEffect, useState } from 'react';
import jobsService from '../services/jobsService';
import resumeService from '../services/resumeService';
import applicationsService from '../services/applicationsService';
import Loader from '../components/Loader';
import JobCard from '../components/JobCard';
import { useAuth } from '../context/AuthContext';
import MailHRModal from '../components/MailHRModal';

const RealJobsPage = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [resumeSkills, setResumeSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const company = '';
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [postedWithin, setPostedWithin] = useState('all');
  const [salary, setSalary] = useState('');
  const minScore = 0;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [message, setMessage] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [emailedJobIds, setEmailedJobIds] = useState(new Set());
  const [activeMailJob, setActiveMailJob] = useState(null);
  const [savedJobIds, setSavedJobIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('saved_jobs') || '[]');
      return new Set(saved);
    } catch {
      return new Set();
    }
  });
  const [sortBy, setSortBy] = useState('matchScore');

  async function fetchRecommendationsAndApplications() {
    setLoading(true);
    setMessage('');
    try {
      let currentQuery = query;
      let activeSkills = resumeSkills;
      if (activeSkills.length === 0) {
        try {
          const resumeData = await resumeService.getMyResume();
          if (resumeData && resumeData.extractedSkills && resumeData.extractedSkills.length > 0) {
            activeSkills = resumeData.extractedSkills;
            setResumeSkills(activeSkills);
            if (!currentQuery) {
              currentQuery = resumeData.extractedSkills.slice(0, 3).join(', ');
              setQuery(currentQuery);
            }
          }
        } catch {
          console.log('No resume uploaded yet.');
        }
      }

      const params = {
        page,
        limit: 10,
        // Only include location if the user typed one — empty = show all global jobs
        ...(location ? { location } : {}),
        company,
        skills: currentQuery,
        minScore,
        remote: remoteOnly ? 'true' : 'false',
        sortBy,
        salary,
        postedWithin,
      };

      console.log('RealJobsPage: Fetching recommendations with params:', params);
      const [recResult, appsResult] = await Promise.allSettled([
        jobsService.getRecommendations(params),
        applicationsService.getMyApplications(),
      ]);

      console.log('RealJobsPage: Promise.allSettled results:', {
        recommendations: recResult,
        applications: appsResult,
      });

      if (recResult.status === 'fulfilled') {
        const recList = recResult.value?.recommendations || [];
        console.log(`RealJobsPage: Recommendations loaded successfully. Count: ${recList.length}`);
        setRecommendations(recList);
        setTotalPages(recResult.value?.pagination?.totalPages || 1);
        if (recResult.value?.sync?.synced) {
          setMessage('Jobs synced from live India job sources.');
        }
        // Smooth scroll to top of scrolling viewport (.content-area) when page changes
        const contentEl = document.querySelector('.content-area');
        if (contentEl) {
          contentEl.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        console.error('RealJobsPage: Recommendations fetch failed:', recResult.reason);
        setMessage('Unable to fetch job recommendations.');
      }

      const appliedIds = new Set();
      const emailedIds = new Set();
      if (appsResult.status === 'fulfilled') {
        (appsResult.value?.applications || []).forEach((app) => {
          const id = app.jobId?._id || app.jobId;
          if (id) {
            const idStr = id.toString();
            if (app.applied) appliedIds.add(idStr);
            if (app.emailSent) emailedIds.add(idStr);
          }
        });
      }
      setAppliedJobIds(appliedIds);
      setEmailedJobIds(emailedIds);
    } catch {
      setMessage('Failed to load real jobs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchRecommendationsAndApplications();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, remoteOnly, sortBy, postedWithin]);

  const handleSearch = () => {
    setPage(1);
    fetchRecommendationsAndApplications();
  };

  const handleSyncJobs = async () => {
    setSyncing(true);
    setMessage(`Syncing jobs for "${query || 'software engineer'}"...`);
    try {
      const response = await jobsService.syncJobs({ keywords: query, location });
      const newJobs = response?.result?.totalIngested ?? 0;
      const duplicates = response?.result?.totalDuplicates ?? 0;
      if (newJobs > 0) {
        setMessage(`Job sync completed! Added ${newJobs} new jobs.`);
      } else {
        setMessage(`Job sync completed. No new jobs found (${duplicates} duplicates skipped).`);
      }
      await fetchRecommendationsAndApplications();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Job sync failed or already in progress.');
    } finally {
      setSyncing(false);
    }
  };

  const handleApply = async (job) => {
    const jobId = job._id || job.id;
    const postingUrl = job.applyUrlResolved || job.jobUrl || job.applyUrl;
    
    if (postingUrl) {
      window.open(postingUrl, '_blank', 'noopener,noreferrer');
    }
    
    try {
      await applicationsService.applyToJob({ jobId });
      setMessage('Redirected to application page. Recorded in your Applications.');
      setAppliedJobIds((prev) => new Set([...prev, jobId]));
    } catch {
      setAppliedJobIds((prev) => new Set([...prev, jobId]));
    }
  };

  const handleMailHR = (job) => {
    setActiveMailJob(job);
  };

  const toggleSaveJob = (jobId) => {
    const updated = new Set(savedJobIds);
    if (updated.has(jobId)) {
      updated.delete(jobId);
    } else {
      updated.add(jobId);
    }
    setSavedJobIds(updated);
    localStorage.setItem('saved_jobs', JSON.stringify(Array.from(updated)));
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Jobs & AI Recommendations</h1>
          <p>Live scraped jobs from LinkedIn, Naukri, Indeed, and Unstop.</p>
        </div>
      </div>

      <div className="search-panel panel">
        <div className="search-grid">
          <div className="search-field">
            <label htmlFor="keywords-input">Keywords / Skills</label>
            <input
              id="keywords-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. React, Node.js"
            />
          </div>
          <div className="search-field">
            <label htmlFor="location-input">Location (optional)</label>
            <input
              id="location-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. India, US, Remote"
            />
          </div>
          <div className="search-field">
            <label htmlFor="salary-input">Package / Salary</label>
            <input
              id="salary-input"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="e.g. 10 LPA"
            />
          </div>
          <div className="search-field">
            <label htmlFor="date-select">Posted Within</label>
            <select
              id="date-select"
              value={postedWithin}
              onChange={(e) => setPostedWithin(e.target.value)}
              style={{
                background: '#111827',
                border: '1px solid #334155',
                borderRadius: '0.75rem',
                color: '#e2e8f0',
                padding: '0.9rem 1rem',
                outline: 'none',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Time</option>
              <option value="24h">Past 24 Hours</option>
              <option value="7d">Past Week</option>
              <option value="30d">Past Month</option>
            </select>
          </div>
          <div className="search-field">
            <label htmlFor="sort-select">Sort By</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                background: '#111827',
                border: '1px solid #334155',
                borderRadius: '0.75rem',
                color: '#e2e8f0',
                padding: '0.9rem 1rem',
                outline: 'none',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              <option value="matchScore">AI Match Score</option>
              <option value="date">Date Posted (Newest)</option>
            </select>
          </div>
          <div className="search-checkbox-container">
            <input
              type="checkbox"
              id="remote-checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
            />
            <label htmlFor="remote-checkbox" style={{ cursor: 'pointer', margin: 0, fontWeight: 500, color: '#94a3b8' }}>
              Remote Only
            </label>
          </div>
          <div className="search-actions">
            <button className="button button-primary" onClick={handleSearch} disabled={loading || syncing} type="button">
              Find Jobs
            </button>
            <button className="button button-secondary" onClick={handleSyncJobs} disabled={loading || syncing} type="button">
              {syncing ? 'Syncing…' : 'Sync Jobs'}
            </button>
          </div>
        </div>

        {resumeSkills.length > 0 && (
          <div className="resume-skills-filter" style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Filter by your resume skills (click to toggle):
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {resumeSkills.map((skill) => {
                const queryTerms = query.split(',').map((t) => t.trim()).filter(Boolean);
                const isActive = queryTerms.some((t) => t.toLowerCase() === skill.toLowerCase());
                return (
                  <button
                    key={skill}
                    onClick={() => {
                      let newTerms;
                      if (isActive) {
                        newTerms = queryTerms.filter((t) => t.toLowerCase() !== skill.toLowerCase());
                      } else {
                        newTerms = [...queryTerms, skill];
                      }
                      setQuery(newTerms.join(', '));
                    }}
                    className={`skill-filter-btn ${isActive ? 'active' : ''}`}
                    type="button"
                  >
                    {skill} {isActive ? '✓' : '+'}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>



      {message && <div className="alert-message">{message}</div>}

      {loading || syncing ? (
        <Loader message={syncing ? 'Syncing jobs from live global sources…' : 'Loading AI recommendations…'} />
      ) : recommendations.length === 0 ? (
        <div className="panel empty-state">
          No matching roles yet. Upload your resume and click <strong>Sync Jobs</strong>, or adjust your filters.
        </div>
      ) : (
        <div className="jobs-grid">
          {recommendations
            .filter(rec => {
              const job = rec.jobId || rec.job;
              const jobId = job?._id || job?.id;
              return !(appliedJobIds.has(jobId) && emailedJobIds.has(jobId));
            })
            .map((rec) => {
              const job = rec.jobId || rec.job;
              const matchScore = rec.recommendationScore ?? rec.matchScore ?? 0;
              const recommendationReason = rec.recommendationReason;
              const missingSkills = rec.missingSkills;
              if (!job) return null;

              const jobId = job._id || job.id;

               return (
                <JobCard
                  key={jobId}
                  job={job}
                  matchScore={matchScore}
                  recommendationReason={recommendationReason}
                  missingSkills={missingSkills}
                  isSaved={savedJobIds.has(jobId)}
                  isApplied={appliedJobIds.has(jobId)}
                  isEmailSent={emailedJobIds.has(jobId)}
                  onSaveToggle={toggleSaveJob}
                  onApply={handleApply}
                  onMailHR={handleMailHR}
                />
              );
            })}
        </div>
      )}

      {activeMailJob && (
        <MailHRModal
          job={activeMailJob}
          user={user}
          onClose={() => setActiveMailJob(null)}
          onEmailSent={(msg) => {
            setMessage(msg);
            setActiveMailJob(null);
            fetchRecommendationsAndApplications();
          }}
        />
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="button button-secondary" type="button">
            Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="button button-secondary" type="button">
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default RealJobsPage;

