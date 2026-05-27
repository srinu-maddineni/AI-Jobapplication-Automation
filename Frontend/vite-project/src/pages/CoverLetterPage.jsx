import { useState, useEffect } from 'react';
import aiService from '../services/aiService';
import resumeService from '../services/resumeService';
import Loader from '../components/Loader';
import { jsPDF } from 'jspdf';

// Build a concise candidate profile summary from the extracted resume data
const buildProfileFromResume = (resume) => {
  if (!resume) return '';

  const skills = resume.extractedSkills && resume.extractedSkills.length > 0
    ? `Skills: ${resume.extractedSkills.join(', ')}.`
    : '';

  // Take the first 600 chars of extracted text as a base summary
  const summary = resume.extractedText
    ? resume.extractedText.slice(0, 600).replace(/\s+/g, ' ').trim()
    : '';

  return [summary, skills].filter(Boolean).join('\n\n');
};

const CoverLetterPage = () => {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [profile, setProfile] = useState('');
  const [letter, setLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [resumeFile, setResumeFile] = useState(null);
  const [message, setMessage] = useState('');

  const loadResumeProfile = async () => {
    setResumeLoading(true);
    try {
      const resume = await resumeService.getMyResume();
      if (resume) {
        setResumeFile(resume.originalFileName);
        setProfile(buildProfileFromResume(resume));
      }
    } catch {
      // silently ignore — user might not have a resume yet
    } finally {
      setResumeLoading(false);
    }
  };

  useEffect(() => {
    loadResumeProfile();
  }, []);

  const handleGenerate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const data = await aiService.generateCoverLetter({ profile, company, role, jobDescription });
      setLetter(data.generatedContent);
    } catch (error) {
      setMessage('Unable to generate cover letter.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    const pdf = new jsPDF();
    const text = letter || 'No letter generated yet.';
    const lines = pdf.splitTextToSize(text, 180);
    pdf.text(lines, 15, 20);
    pdf.save(`${role || 'cover-letter'}.pdf`);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Cover Letter Generator</h1>
          <p>Generate personalized cover letters with AI and download them in PDF format.</p>
        </div>
      </div>
      <div className="panel form-card">
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span>Candidate profile</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85em' }}>
              {resumeLoading ? (
                <span style={{ opacity: 0.6 }}>Loading resume…</span>
              ) : resumeFile ? (
                <>
                  <span style={{ opacity: 0.7 }}>📄 {resumeFile}</span>
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ padding: '2px 10px', fontSize: '0.82em' }}
                    onClick={loadResumeProfile}
                  >
                    ↺ Reload from resume
                  </button>
                </>
              ) : (
                <span style={{ opacity: 0.6 }}>No resume found — <a href="/resume" style={{ textDecoration: 'underline' }}>upload one</a></span>
              )}
            </span>
          </span>
          <textarea
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            rows={6}
            placeholder="Your profile will be auto-filled from your uploaded resume. You can also edit it manually."
          />
        </label>
        <label>
          Company
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc." />
        </label>
        <label>
          Role
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Product Engineer" />
        </label>
        <label>
          Job description
          <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={6} />
        </label>
        <button className="button button-primary" onClick={handleGenerate} disabled={loading || !company || !role || !jobDescription || !profile}>
          {loading ? 'Generating...' : 'Generate cover letter'}
        </button>
      </div>
      {message && <div className="alert-message">{message}</div>}
      {loading && <Loader message="Crafting your cover letter..." />}
      {letter && (
        <div className="panel section-panel mt-6">
          <div className="section-header">
            <h2>Generated letter</h2>
            <button onClick={downloadPdf} className="button button-secondary">
              Download PDF
            </button>
          </div>
          <div className="card card-text-block" style={{ whiteSpace: 'pre-wrap' }}>{letter}</div>
        </div>
      )}
    </div>
  );
};

export default CoverLetterPage;
