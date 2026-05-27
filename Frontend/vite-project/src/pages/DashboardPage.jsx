import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jobsService from '../services/jobsService';
import resumeService from '../services/resumeService';
import applicationsService from '../services/applicationsService';
import JobCard from '../components/JobCard';
import Loader from '../components/Loader';
import MailHRModal from '../components/MailHRModal';
import { useAuth } from '../context/AuthContext';

/* ── Animated counter ── */
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) return;
    let start = 0;
    const step = Math.ceil(value / 30);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return display;
}

/* ── Stat Card ── */
function StatCard({ icon, label, value, sub, color, onClick, delay = 0 }) {
  return (
    <div
      className={`stat-card ${color}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', animationDelay: `${delay}s` }}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-number">
        <AnimatedNumber value={value} />
      </div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-change">↑ {sub}</div>}
    </div>
  );
}

/* ── Activity Feed Item ── */
function ActivityItem({ icon, text, time, color }) {
  return (
    <div style={{
      display:'flex', alignItems:'flex-start', gap:'0.85rem',
      padding:'0.85rem 0',
      borderBottom:'1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{
        width:36, height:36, borderRadius:10,
        background:`rgba(${color},0.1)`,
        border:`1px solid rgba(${color},0.2)`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'1rem', flexShrink:0,
      }}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'0.85rem', color:'#94a3b8', lineHeight:1.4 }}>{text}</div>
        <div style={{ fontSize:'0.75rem', color:'#475569', marginTop:'0.2rem' }}>{time}</div>
      </div>
    </div>
  );
}

const DashboardPage = () => {
  const { user } = useAuth();
  const [resume,            setResume]            = useState(null);
  const [matchedJobs,       setMatchedJobs]       = useState([]);
  const [totalMatchedJobs,  setTotalMatchedJobs]  = useState(0);
  const [totalJobs,         setTotalJobs]         = useState(0);
  const [applications,      setApplications]      = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [appliedJobIds,     setAppliedJobIds]     = useState(new Set());
  const [emailedJobIds,     setEmailedJobIds]     = useState(new Set());
  const [activeMailJob,     setActiveMailJob]     = useState(null);
  const [message,           setMessage]           = useState('');
  const navigate = useNavigate();

  const loadDashboard = async () => {
    try {
      const [resumeData, matchedData, jobsData, appsData] = await Promise.allSettled([
        resumeService.getMyResume(),
        jobsService.getMatchedJobs(),
        jobsService.getJobs({ limit: 1 }),
        applicationsService.getMyApplications(),
      ]);

      if (resumeData.status === 'fulfilled') setResume(resumeData.value);
      if (matchedData.status === 'fulfilled') {
        setMatchedJobs(matchedData.value?.matchedJobs || []);
        setTotalMatchedJobs(matchedData.value?.pagination?.total || matchedData.value?.total || 0);
      }
      if (jobsData.status   === 'fulfilled') {
        setTotalJobs(jobsData.value?.pagination?.total || jobsData.value?.total || 0);
      }
      if (appsData.status === 'fulfilled') setApplications(appsData.value?.applications || []);

      const appliedIds = new Set();
      const emailedIds = new Set();
      if (appsData.status === 'fulfilled') {
        (appsData.value?.applications || []).forEach(app => {
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleApply = async (job) => {
    const jobId = job._id || job.id;
    const url = job.applyUrlResolved || job.jobUrl || job.applyUrl;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    try {
      await applicationsService.applyToJob({ jobId });
      setAppliedJobIds(prev => new Set([...prev, jobId]));
    } catch {
      setAppliedJobIds(prev => new Set([...prev, jobId]));
    }
  };

  if (loading) return <Loader message="Loading your dashboard…" />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? '☀️ Good morning' : hour < 17 ? '🌤 Good afternoon' : '🌙 Good evening';

  return (
    <div className="page-content">
      {message && <div className="alert-message">{message}</div>}

      {/* ── Hero Header ── */}
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <div className="page-header-badge">🤖 AI-Powered Dashboard</div>
          <h1>{greeting}, {resume?.candidateName?.split(' ')[0] || 'there'}!</h1>
          <p>Your job search at a glance — matched opportunities, applications, and insights.</p>
        </div>
        <div style={{ display:'flex', gap:'0.65rem' }}>
          <button className="button button-secondary" onClick={() => navigate('/jobs')}>
            💼 Browse Jobs
          </button>
          <button className="button button-primary" onClick={() => navigate('/resume')}>
            📄 Upload Resume
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="dashboard-grid">
        <StatCard icon="💼" label="Total Jobs" value={totalJobs} sub="in database" color="indigo" delay={0} onClick={() => navigate('/jobs')} />
        <StatCard icon="🎯" label="Matched Jobs" value={totalMatchedJobs} sub="to your resume" color="violet" delay={0.05} onClick={() => navigate('/jobs')} />
        <StatCard icon="✅" label="Applications" value={applications.length} sub="submitted" color="emerald" delay={0.1} onClick={() => navigate('/applications')} />
        <StatCard icon="📄" label="Resume" value={resume ? 1 : 0} sub={resume ? 'uploaded' : 'not uploaded'} color="amber" delay={0.15} onClick={() => navigate('/resume')} />
      </div>

      {/* ── Main Content Grid ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:'1.5rem', alignItems:'start' }}>

        {/* Left: Matched Jobs */}
        <div>
          <section className="panel section-panel" style={{ padding:0, overflow:'hidden' }}>
            <div style={{
              padding:'1.25rem 1.75rem',
              background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.05))',
              borderBottom:'1px solid rgba(255,255,255,0.05)',
              display:'flex', justifyContent:'space-between', alignItems:'center',
            }}>
              <div>
                <h2 style={{ margin:0, fontSize:'1.1rem', fontWeight:700, color:'#f1f5f9' }}>
                  🎯 Top Matches
                </h2>
                <p style={{ margin:'0.2rem 0 0', fontSize:'0.82rem', color:'#64748b' }}>
                  Jobs matched to your resume skills
                </p>
              </div>
              <button className="button button-secondary" style={{ fontSize:'0.8rem', padding:'0.45rem 1rem' }}
                onClick={() => navigate('/jobs')}>
                View All →
              </button>
            </div>
            <div style={{ padding:'1.25rem 1.75rem' }}>
              {matchedJobs.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon">🔍</span>
                  <strong style={{ display:'block', marginBottom:'0.5rem', color:'#94a3b8' }}>No matches yet</strong>
                  <span>Upload your resume and sync jobs to see personalized matches.</span>
                </div>
              ) : (
                <div className="jobs-grid">
                  {matchedJobs
                    .filter(item => {
                      const actualJob = item.job || item;
                      const id = actualJob._id || actualJob.id;
                      return !(appliedJobIds.has(id) && emailedJobIds.has(id));
                    })
                    .slice(0, 3)
                    .map((item, index) => {
                      const actualJob = item.job || item;
                      const id = actualJob._id || actualJob.id;
                      const isApplied = appliedJobIds.has(id);
                      const isEmailSent = emailedJobIds.has(id);
                      return (
                        <JobCard
                          key={id || index}
                          job={actualJob}
                          isApplied={isApplied}
                          isEmailSent={isEmailSent}
                          matchScore={item.matchScore}
                          onApply={handleApply}
                          onMailHR={(job) => setActiveMailJob(job)}
                        />
                      );
                    })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right: Activity & Quick Actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

          {/* Quick Actions */}
          <div className="panel" style={{ padding:'1.25rem' }}>
            <h2 style={{ fontSize:'1rem', marginBottom:'1rem', color:'#94a3b8', fontWeight:700 }}>
              ⚡ Quick Actions
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {[
                { icon:'💼', label:'Browse All Jobs',    path:'/jobs',         color:'99,102,241' },
                { icon:'📄', label:'Manage Resume',       path:'/resume',       color:'139,92,246' },
                { icon:'✉️', label:'Generate Cover Letter', path:'/cover-letter', color:'6,182,212'  },
                { icon:'🔖', label:'Saved Jobs',          path:'/saved-jobs',   color:'245,158,11' },
              ].map(({ icon, label, path, color }) => (
                <button key={path}
                  onClick={() => navigate(path)}
                  style={{
                    display:'flex', alignItems:'center', gap:'0.75rem',
                    padding:'0.7rem 0.9rem', borderRadius:'0.85rem',
                    background:`rgba(${color},0.06)`,
                    border:`1px solid rgba(${color},0.12)`,
                    color:'#94a3b8', fontSize:'0.85rem', fontWeight:600,
                    cursor:'pointer', transition:'all 0.2s', textAlign:'left',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `rgba(${color},0.14)`;
                    e.currentTarget.style.color = '#f1f5f9';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = `rgba(${color},0.06)`;
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.transform = '';
                  }}
                >
                  <span style={{ fontSize:'1.1rem' }}>{icon}</span>
                  {label}
                  <span style={{ marginLeft:'auto', opacity:0.4, fontSize:'0.9rem' }}>→</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="panel" style={{ padding:'1.25rem' }}>
            <h2 style={{ fontSize:'1rem', marginBottom:'0.25rem', color:'#94a3b8', fontWeight:700 }}>
              📊 Activity Feed
            </h2>
            {applications.length === 0 && matchedJobs.length === 0 ? (
              <div style={{ color:'#475569', fontSize:'0.85rem', padding:'1rem 0' }}>
                No activity yet — start by syncing jobs!
              </div>
            ) : (
              <div>
                {applications.slice(0, 4).map((app, i) => (
                  <ActivityItem
                    key={i}
                    icon="✅"
                    text={`Applied to ${app.jobId?.title || 'a job'} at ${app.jobId?.company || 'a company'}`}
                    time={app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Recently'}
                    color="16,185,129"
                  />
                ))}
                {matchedJobs.length > 0 && (
                  <ActivityItem
                    icon="🎯"
                    text={`${matchedJobs.length} jobs matched to your resume`}
                    time="Latest sync"
                    color="99,102,241"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Resume CTA ── */}
      {!resume && (
        <div style={{
          marginTop:'1.5rem',
          background:'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))',
          border:'1px solid rgba(99,102,241,0.2)',
          borderRadius:'1.25rem',
          padding:'1.75rem 2rem',
          display:'flex', alignItems:'center', gap:'1.5rem',
          animation:'fadeUp 0.5s ease 0.3s both',
        }}>
          <div style={{ fontSize:'2.5rem', animation:'float 3s ease-in-out infinite' }}>📄</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:'1.05rem', color:'#f1f5f9', marginBottom:'0.3rem' }}>
              Upload your resume to unlock AI matching
            </div>
            <div style={{ color:'#64748b', fontSize:'0.88rem' }}>
              Get personalized job matches, skill gap analysis, and auto-generated cover letters.
            </div>
          </div>
          <button className="button button-primary" onClick={() => navigate('/resume')}>
            Upload Resume →
          </button>
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
            loadDashboard();
          }}
        />
      )}
    </div>
  );
};

export default DashboardPage;
