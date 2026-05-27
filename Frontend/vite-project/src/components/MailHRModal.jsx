import { useState, useEffect } from 'react';
import aiService from '../services/aiService';
import resumeService from '../services/resumeService';
import applicationsService from '../services/applicationsService';
import Loader from './Loader';

// Build a concise candidate profile summary from the extracted resume data
const buildProfileFromResume = (resume) => {
  if (!resume) return '';

  const skills = resume.extractedSkills && resume.extractedSkills.length > 0
    ? `Skills: ${resume.extractedSkills.join(', ')}.`
    : '';

  const summary = resume.extractedText
    ? resume.extractedText.slice(0, 600).replace(/\s+/g, ' ').trim()
    : '';

  return [summary, skills].filter(Boolean).join('\n\n');
};

export default function MailHRModal({ job, user, onClose, onEmailSent }) {
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  
  const [resume, setResume] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [simulationDetails, setSimulationDetails] = useState(null);

  // 1. Scan job description for emails or create domain-based email suggestion
  useEffect(() => {
    if (!job) return;

    // Scan for emails using regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const foundEmails = job.description ? job.description.match(emailRegex) : null;
    
    if (foundEmails && foundEmails.length > 0) {
      setToEmail(foundEmails[0]);
    } else {
      // Create a sensible domain fallback suggestion based on company name
      const cleanCompany = job.company
        .toLowerCase()
        .replace(/\b(technologies|technology|gmbh|inc|pvt|ltd|limited|co|corp|corporation|solutions|services|software|systems|india|global|electronics|labs|group|consulting|international|associates|partners|ventures|industries)\b/gi, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
      setToEmail(`hr@${cleanCompany || 'company'}.com`);

      // Query AI in the background to get the precise official domain name
      aiService.getCompanyDomain(job.company)
        .then((res) => {
          if (res && res.domain) {
            setToEmail(`hr@${res.domain}`);
          }
        })
        .catch((err) => {
          console.error('Failed to resolve AI company domain:', err);
        });
    }

    // Prefill subject
    setSubject(`Application for ${job.title} - ${user?.name || 'Job Applicant'}`);

    // Prefill default message body template
    const defaultMsg = `Dear HR Team,

I am writing to express my interest in the ${job.title} position at ${job.company}. 

Based on my professional background, skills, and experience, I believe I am well-suited for this role. I have attached my resume to this email for your review.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
${user?.name || 'Job Applicant'}
${user?.email ? `Email: ${user.email}` : ''}`;

    setBody(defaultMsg);
  }, [job, user]);

  // 2. Fetch candidate's resume when modal opens
  useEffect(() => {
    const fetchResume = async () => {
      setResumeLoading(true);
      try {
        const resumeData = await resumeService.getMyResume();
        setResume(resumeData);
      } catch (err) {
        console.error('Failed to load resume details:', err);
      } finally {
        setResumeLoading(false);
      }
    };
    fetchResume();
  }, []);

  // 3. Generate cover letter using AI
  const handleGenerateAI = async () => {
    if (!resume) {
      setErrorMsg('Please upload a resume first before using AI cover letter generation.');
      return;
    }
    
    setGeneratingAI(true);
    setErrorMsg('');
    try {
      const profileText = buildProfileFromResume(resume);
      const data = await aiService.generateCoverLetter({
        profile: profileText,
        company: job.company,
        role: job.title,
        jobDescription: job.description || 'Job details not specified.',
      });
      if (data && data.generatedContent) {
        setBody(data.generatedContent);
      } else {
        setErrorMsg('AI cover letter generation succeeded but returned empty content.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Unable to generate cover letter with AI. Check if OpenAI API key is set.');
    } finally {
      setGeneratingAI(false);
    }
  };

  // 4. Send email
  const handleSend = async (e) => {
    e.preventDefault();
    if (!toEmail.trim()) {
      setErrorMsg('Please specify the recipient HR email.');
      return;
    }
    if (!resume) {
      setErrorMsg('You must have an uploaded resume to attach before sending.');
      return;
    }

    setSending(true);
    setErrorMsg('');
    try {
      const result = await applicationsService.sendHREmail({
        jobId: job._id || job.id,
        toEmail,
        subject,
        body,
      });

      if (result.simulated) {
        setSimulationDetails({
          toEmail,
          subject,
          body,
          message: result.message
        });
      } else {
        onEmailSent(result.message || 'Application email sent successfully!');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (simulationDetails) {
    const mailtoUrl = `mailto:${encodeURIComponent(simulationDetails.toEmail)}?subject=${encodeURIComponent(simulationDetails.subject)}&body=${encodeURIComponent(simulationDetails.body)}`;
    
    return (
      <div style={overlayStyle}>
        <div style={{ ...modalStyle, width: 'min(480px, 95%)' }}>
          <div style={headerStyle}>
            <div>
              <h2 style={titleStyle}>✉️ Send Email via Mail App</h2>
              <p style={subtitleStyle}>Send the application manually using your own mail app</p>
            </div>
            <button onClick={onClose} style={closeBtnStyle} title="Close dialog">✕</button>
          </div>
          <div style={{ ...bodyStyle, textAlign: 'center', padding: '2rem', gap: '1.25rem' }}>
            <div style={{ fontSize: '3rem', margin: '0.5rem 0' }}>📬</div>
            <h3 style={{ fontSize: '1.15rem', color: '#1e293b', margin: 0, fontWeight: 700 }}>
              Open Prefilled Email in your Mail App
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
              We have generated the cover letter and prefilled the recipient address. Click the button below to open your local mail client (like Outlook, Mail app, or Gmail) and send the email yourself.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
              <a
                href={mailtoUrl}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  textDecoration: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setTimeout(() => {
                    onEmailSent('Opened local mail client with prefilled cover letter!');
                  }, 500);
                }}
              >
                Open in Mail App
              </a>
              
              <button
                type="button"
                className="button button-secondary"
                style={{ borderRadius: '999px', padding: '0.7rem 1.5rem', fontSize: '0.9rem' }}
                onClick={() => {
                  navigator.clipboard.writeText(simulationDetails.body);
                  alert('Email body copied to clipboard!');
                }}
              >
                📋 Copy Cover Letter
              </button>
            </div>
            
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline', marginTop: '0.5rem' }}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>✉️ Email Application</h2>
            <p style={subtitleStyle}>Send your resume directly to HR at {job.company}</p>
          </div>
          <button onClick={onClose} style={closeBtnStyle} title="Close dialog">✕</button>
        </div>

        {/* Content Body */}
        <div style={bodyStyle}>
          {errorMsg && (
            <div style={errorBannerStyle}>
              ⚠️ {errorMsg}
            </div>
          )}

          {resumeLoading ? (
            <Loader message="Checking resume attachment..." />
          ) : !resume ? (
            <div style={warningBoxStyle}>
              <strong>⚠️ No Resume Uploaded</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem' }}>
                You must upload a resume before you can apply. Go to the <a href="/resume" style={{ textDecoration: 'underline', color: 'inherit', fontWeight: 'bold' }}>Resume page</a> to upload one.
              </p>
            </div>
          ) : (
            <div style={attachmentChipStyle}>
              📎 <strong>Attached Resume:</strong> {resume.originalFileName}
            </div>
          )}

          <form onSubmit={handleSend} style={formStyle}>
            <label style={labelStyle}>
              <span>HR Email Address <span style={{ color: 'var(--rose)' }}>*</span></span>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="hr@company.com"
                required
                disabled={sending || generatingAI}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span>Email Subject <span style={{ color: 'var(--rose)' }}>*</span></span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Application for..."
                required
                disabled={sending || generatingAI}
                style={inputStyle}
              />
            </label>

            <div style={labelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span>Email Body (Cover Letter) <span style={{ color: 'var(--rose)' }}>*</span></span>
                {resume && (
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={generatingAI || sending}
                    style={aiDraftBtnStyle}
                  >
                    {generatingAI ? '⏳ Drafting...' : '🤖 Generate with AI'}
                  </button>
                )}
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                required
                disabled={sending || generatingAI}
                style={textareaStyle}
              />
            </div>

            {/* Footer Actions */}
            <div style={footerStyle}>
              <button
                type="button"
                onClick={onClose}
                disabled={sending || generatingAI}
                className="button button-secondary"
                style={{ borderRadius: '999px', padding: '0.6rem 1.4rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || generatingAI || !resume}
                className="button button-success"
                style={{
                  borderRadius: '999px',
                  padding: '0.6rem 1.6rem',
                  background: 'linear-gradient(135deg,#059669,#10b981)',
                  boxShadow: '0 4px 14px rgba(5,150,105,0.25)'
                }}
              >
                {sending ? '✉️ Sending...' : '✉️ Send Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   INLINE STYLES
   ══════════════════════════════════════════════════════ */
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
  animation: 'fadeIn 0.2s ease-out'
};

const modalStyle = {
  background: '#ffffff',
  width: 'min(650px, 95%)',
  borderRadius: '1.25rem',
  border: '1px solid #e2e8f0',
  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '90vh',
  animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
};

const headerStyle = {
  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  padding: '1.25rem 1.5rem',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0
};

const titleStyle = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: '1.15rem',
  fontWeight: 700,
  color: '#ffffff',
  margin: 0
};

const subtitleStyle = {
  fontSize: '0.78rem',
  color: 'rgba(255, 255, 255, 0.85)',
  margin: '0.2rem 0 0'
};

const closeBtnStyle = {
  background: 'rgba(255, 255, 255, 0.15)',
  border: 'none',
  color: '#ffffff',
  borderRadius: '50%',
  width: '30px',
  height: '30px',
  cursor: 'pointer',
  fontSize: '0.85rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s'
};

const bodyStyle = {
  padding: '1.5rem',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.1rem'
};

const errorBannerStyle = {
  padding: '0.65rem 1rem',
  background: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#b91c1c',
  borderRadius: '0.75rem',
  fontSize: '0.84rem',
  fontWeight: 500
};

const warningBoxStyle = {
  padding: '1rem',
  background: '#fffbeb',
  border: '1px solid #fde68a',
  color: '#b45309',
  borderRadius: '0.85rem',
  fontSize: '0.88rem'
};

const attachmentChipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  background: '#f0fdf4',
  border: '1px solid #bbf7d0',
  color: '#166534',
  padding: '0.5rem 0.9rem',
  borderRadius: '0.75rem',
  fontSize: '0.85rem',
  fontWeight: 500,
  gap: '0.3rem'
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.1rem'
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  fontSize: '0.82rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)'
};

const inputStyle = {
  textTransform: 'none',
  letterSpacing: 'normal',
  fontSize: '0.92rem',
  fontWeight: 400
};

const textareaStyle = {
  textTransform: 'none',
  letterSpacing: 'normal',
  fontSize: '0.9rem',
  lineHeight: 1.5,
  fontWeight: 400,
  resize: 'vertical',
  minHeight: '160px'
};

const aiDraftBtnStyle = {
  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '999px',
  padding: '0.28rem 0.8rem',
  fontSize: '0.72rem',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
  transition: 'transform 0.15s',
  outline: 'none',
  textTransform: 'none',
  letterSpacing: 'normal'
};

const footerStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  paddingTop: '0.85rem',
  borderTop: '1px solid #e2e8f0',
  marginTop: '0.5rem'
};
