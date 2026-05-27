import { useEffect, useState } from 'react';
import resumeService from '../services/resumeService';
import ResumeCard from '../components/ResumeCard';
import Loader from '../components/Loader';

const ResumePage = () => {
  const [resume, setResume] = useState(null);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResume = async () => {
      try {
        const response = await resumeService.getMyResume();
        setResume(response);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadResume();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setMessage('Please choose a resume file first.');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);
    setSubmitting(true);
    setMessage('');

    try {
      const response = await resumeService.uploadResume(formData);
      setResume(response.resume || response);
      setMessage('Resume uploaded successfully.');
      setFile(null);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to upload resume.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader message="Loading resume information..." />;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Resume</h1>
          <p>Upload your resume and let the system extract key skills for job matching.</p>
        </div>
      </div>
      <div className="section-panel">
        <div className="section-header">
          <h2>Upload a new resume</h2>
        </div>
        <form onSubmit={handleSubmit} className="form-card">
          <label className="field-label">
            Resume file
            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? 'Uploading...' : 'Upload resume'}
          </button>
        </form>
        {message && <div className="form-message">{message}</div>}
      </div>
      {resume ? (
        <div className="section-panel">
          <div className="section-header">
            <h2>Parsed resume</h2>
          </div>
          <ResumeCard resume={resume} />
        </div>
      ) : (
        <div className="panel empty-state">No resume uploaded yet.</div>
      )}
    </div>
  );
};

export default ResumePage;
