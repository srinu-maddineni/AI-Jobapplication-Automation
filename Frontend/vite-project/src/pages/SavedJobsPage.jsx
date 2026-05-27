import { useEffect, useState } from 'react';
import jobsService from '../services/jobsService';
import applicationsService from '../services/applicationsService';
import Loader from '../components/Loader';
import JobCard from '../components/JobCard';
import MailHRModal from '../components/MailHRModal';
import { useAuth } from '../context/AuthContext';

const SavedJobsPage = () => {
  const { user } = useAuth();
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [activeMailJob, setActiveMailJob] = useState(null);

  async function fetchSavedJobs() {
    setLoading(true);
    setMessage('');
    try {
      const savedIds = JSON.parse(localStorage.getItem('saved_jobs') || '[]');
      if (savedIds.length === 0) {
        setSavedJobs([]);
        setLoading(false);
        return;
      }

      // Fetch jobs list
      const [jobsResult, appsResult] = await Promise.allSettled([
        jobsService.getJobs({ limit: 100 }), // Get recent jobs to match against
        applicationsService.getMyApplications(),
      ]);

      if (jobsResult.status === 'fulfilled') {
        const allJobs = jobsResult.value?.jobs || [];
        const filtered = allJobs.filter((job) => savedIds.includes(job._id || job.id));
        setSavedJobs(filtered);
      } else {
        setMessage('Unable to load saved jobs.');
      }

      const appliedIds = new Set();
      if (appsResult.status === 'fulfilled') {
        (appsResult.value?.applications || []).forEach((app) => {
          const id = app.jobId?._id || app.jobId;
          if (id) appliedIds.add(id.toString());
        });
      }
      setAppliedJobIds(appliedIds);
    } catch {
      setMessage('Failed to load saved jobs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchSavedJobs();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemove = (jobId) => {
    const savedIds = JSON.parse(localStorage.getItem('saved_jobs') || '[]');
    const updated = savedIds.filter((id) => id !== jobId);
    localStorage.setItem('saved_jobs', JSON.stringify(updated));
    setSavedJobs((prev) => prev.filter((job) => (job._id || job.id) !== jobId));
  };

  const handleApply = async (job) => {
    const jobId = job._id || job.id;
    const postingUrl = job.applyUrlResolved || job.jobUrl || job.applyUrl;
    
    if (postingUrl) {
      window.open(postingUrl, '_blank', 'noopener,noreferrer');
    }
    
    try {
      await applicationsService.applyToJob({ jobId });
      setAppliedJobIds((prev) => new Set([...prev, jobId]));
    } catch {
      setAppliedJobIds((prev) => new Set([...prev, jobId]));
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Saved Jobs</h1>
          <p>Review roles you bookmarked for later consideration.</p>
        </div>
      </div>

      {message && <div className="alert-message">{message}</div>}

      {loading ? (
        <Loader message="Loading your bookmarked jobs..." />
      ) : savedJobs.length === 0 ? (
        <div className="panel empty-state">You have no saved jobs. Bookmark jobs in the Job Recommendations tab.</div>
      ) : (
        <div className="jobs-grid">
          {savedJobs.map((job) => {
            const jobId = job._id || job.id;
            return (
              <JobCard
                key={jobId}
                job={job}
                isSaved={true}
                isApplied={appliedJobIds.has(jobId)}
                onRemove={handleRemove}
                onApply={handleApply}
                onMailHR={(job) => setActiveMailJob(job)}
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
            fetchSavedJobs();
          }}
        />
      )}
    </div>
  );
};

export default SavedJobsPage;
