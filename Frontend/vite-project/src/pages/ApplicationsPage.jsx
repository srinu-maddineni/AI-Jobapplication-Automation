import { useEffect, useState } from 'react';
import applicationsService from '../services/applicationsService';
import Loader from '../components/Loader';
import StatusBadge from '../components/StatusBadge';

const ApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadApplications = async () => {
    try {
      const result = await applicationsService.getMyApplications();
      setApplications(result?.applications || []);
    } catch (error) {
      setMessage('Unable to load applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const getDisplayStatus = (app) => {
    if (app.emailSent) {
      return 'Email Sent';
    }
    const status = app.status;
    const statusMap = {
      'completed': 'Applied',
      'COMPLETED': 'Applied',
      'applied': 'Applied',
      'pending': 'Pending',
      'interview': 'Interview',
      'offer': 'Offer Received',
      'rejected': 'Rejected',
    };
    return statusMap[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Applied');
  };

  if (loading) {
    return <Loader message="Loading applications..." />;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Applications</h1>
          <p>Track every job application and follow up on your progress.</p>
        </div>
      </div>

      {message && <div className="alert-message">{message}</div>}

      {applications.length === 0 ? (
        <div className="panel empty-state">
          No applications submitted yet. Apply to jobs from the Jobs page or send email applications to HR.
        </div>
      ) : (
        <div className="applications-table panel">
          <div className="table-row table-header">
            <span>Job</span>
            <span>Company</span>
            <span>Status</span>
            <span>Date</span>
            <span>Action</span>
          </div>
          {applications.map((app) => {
            const job = app.jobId;
            const jobUrl = job?.applyUrlResolved || job?.jobUrl || job?.applyUrl || job?.url;

            return (
              <div key={app._id} className="table-row">
                <span>{job?.title || app.title || 'Unknown role'}</span>
                <span>{job?.company || app.company || 'Unknown'}</span>
                <span>
                  <StatusBadge status={getDisplayStatus(app)} />
                </span>
                <span>
                  {new Date(app.appliedAt || app.createdAt).toLocaleDateString()}
                </span>
                <span>
                  {jobUrl ? (
                    <a
                      href={jobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-view-posting"
                    >
                      View Posting
                    </a>
                  ) : (
                    <span style={{ color: '#6b7280' }}>-</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApplicationsPage;
