import { useState } from 'react';
import StatusBadge from './StatusBadge';

const SOURCE_STYLES = {
  LinkedIn: { bg:'#e8f4fd', color:'#0077b5', border:'#c7e2f7' },
  Indeed:   { bg:'#fff3e0', color:'#e05c00', border:'#ffe0b2' },
  Naukri:   { bg:'#fce8e8', color:'#d32f2f', border:'#ffcdd2' },
  Unstop:   { bg:'#f3e8ff', color:'#7c3aed', border:'#e9d5ff' },
};

function getInitials(company = '') {
  return company.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

function getLogoColor(company = '') {
  const colors = [
    ['#6366f1','#8b5cf6'], ['#06b6d4','#6366f1'], ['#10b981','#06b6d4'],
    ['#f59e0b','#ef4444'], ['#ec4899','#8b5cf6'], ['#14b8a6','#6366f1'],
  ];
  const idx = company.charCodeAt(0) % colors.length;
  return `linear-gradient(135deg,${colors[idx][0]},${colors[idx][1]})`;
}

const JobCard = ({
  job,
  matchScore,
  recommendationReason,
  missingSkills = [],
  isSaved,
  isApplied,
  isEmailSent,
  onSaveToggle,
  onApply,
  onMailHR,
  onRemove,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!job) return null;

  const postingUrl = job.applyUrlResolved || job.jobUrl || job.applyUrl;
  const showMatchBadge = matchScore !== undefined && matchScore !== null;
  const srcStyle = SOURCE_STYLES[job.source] || { bg:'rgba(255,255,255,0.06)', color:'#94a3b8', border:'rgba(255,255,255,0.1)' };

  const handleSave = async () => {
    setSaving(true);
    try { await onSaveToggle?.(job._id || job.id); }
    finally { setSaving(false); }
  };

  const handleLocationClick = () => {
    const loc = job.location ? job.location.trim() : '';
    const company = job.company ? job.company.trim() : '';
    const isRemote = !loc || /remote|home|anywhere|work from home/i.test(loc);
    
    let query = '';
    if (isRemote) {
      query = encodeURIComponent(company);
    } else {
      query = encodeURIComponent(`${company} ${loc}`);
    }
    
    if (query) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="card card-job">
      {/* Glow accent top-left */}
      <div style={{
        position:'absolute', top:-30, left:-30,
        width:100, height:100, borderRadius:'50%',
        background: getLogoColor(job.company),
        opacity:0.04, pointerEvents:'none',
        filter:'blur(20px)',
      }}/>

      {/* Header */}
      <div className="card-header">
        <div className="card-company-row">
          <div className="card-company-logo" style={{ background: getLogoColor(job.company) }}>
            {getInitials(job.company)}
          </div>
          <div>
            <h3 className="card-title">{job.title}</h3>
            <p className="card-subtitle">🏢 {job.company}</p>
          </div>
        </div>
        {showMatchBadge && <StatusBadge score={matchScore} />}
      </div>

      {/* Tags row */}
      <div className="card-tags">
        {/* Source badge */}
        {job.source && (
          <span style={{
            display:'inline-flex', alignItems:'center', gap:'0.3rem',
            background: srcStyle.bg, color: srcStyle.color,
            border:`1px solid ${srcStyle.border}`,
            padding:'0.22rem 0.6rem', borderRadius:'999px',
            fontSize:'0.7rem', fontWeight:700,
          }}>● {job.source}</span>
        )}

        {job.remote && <span className="tag tag-cyan">🏡 Remote</span>}
        {job.salary && (
          <span className="tag tag-violet">
            💰 {job.salary}
          </span>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <div className="description-container">
          <div className="description-content" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.65' }}>
            {expanded || job.description.length <= 250
              ? job.description
              : `${job.description.slice(0, 250)}...`}
          </div>
          {job.description.length > 250 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="toggle-desc-btn"
              type="button"
              style={{ marginTop: '0.4rem' }}
            >
              {expanded ? '▲ Show less' : '▼ Show description'}
            </button>
          )}
        </div>
      )}

      {/* Skills */}
      {(job.requiredSkills || []).length > 0 && (
        <div className="skill-tags">
          {job.requiredSkills.slice(0, 5).map(skill => (
            <span key={skill} className="skill-chip" style={{ fontSize:'0.72rem', padding:'0.2rem 0.6rem' }}>
              {skill}
            </span>
          ))}
          {job.requiredSkills.length > 5 && (
            <span className="tag tag-neutral">+{job.requiredSkills.length - 5}</span>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="card-meta">
        <span 
          className="card-meta-item-interactive" 
          onClick={handleLocationClick}
          title={`Search "${job.company}${job.location && !/remote|home|anywhere|work from home/i.test(job.location) ? ' ' + job.location : ''}" on Google Maps`}
        >
          📍 {job.location || 'Remote'}
        </span>
        {job.createdAt && (
          <span className="card-meta-item" style={{ marginLeft:'auto' }}>
            🕐 {(() => {
              const d = Math.floor((Date.now() - new Date(job.createdAt)) / 86400000);
              return d === 0 ? 'Today' : d === 1 ? '1d ago' : `${d}d ago`;
            })()}
          </span>
        )}
      </div>

      {/* AI Recommendation */}
      {recommendationReason && (
        <div className="ai-recommendation-box">
          <strong>🤖 AI Recommendation</strong>
          <p className="ai-recommendation-reason">{recommendationReason}</p>
        </div>
      )}

      {/* Missing Skills */}
      {missingSkills.length > 0 && (
        <div className="missing-skills-section">
          <span className="missing-skills-title">⚠️ Skills to develop</span>
          <div className="skill-tags">
            {missingSkills.map(skill => (
              <span key={skill} className="tag tag-warning">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="card-actions">
        <a href={postingUrl} target="_blank" rel="noreferrer" className="card-link">
          🔗 View posting
        </a>

        <div style={{ display:'flex', gap:'0.5rem', marginLeft:'auto' }}>
          {onRemove ? (
            <button
              onClick={() => onRemove(job._id || job.id)}
              className="button button-secondary"
              type="button"
              style={{ padding:'0.45rem 0.9rem', fontSize:'0.8rem' }}
            >
              Remove
            </button>
          ) : onSaveToggle ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="button button-secondary"
              type="button"
              style={{ padding:'0.45rem 0.9rem', fontSize:'0.8rem' }}
            >
              {isSaved ? '★ Saved' : '☆ Save'}
            </button>
          ) : null}

          {isApplied ? (
            <button
              className="button button-success"
              disabled
              type="button"
              style={{ padding:'0.45rem 0.9rem', fontSize:'0.8rem', opacity:0.7 }}
            >
              ✓ Applied
            </button>
          ) : (
            onApply && (
              <button
                onClick={() => onApply(job)}
                className="button button-primary"
                type="button"
                style={{ padding:'0.45rem 1.1rem', fontSize:'0.82rem' }}
              >
                Apply →
              </button>
            )
          )}
          {onMailHR && (
            isEmailSent ? (
              <button
                className="button"
                disabled
                type="button"
                style={{
                  padding:'0.45rem 1rem',
                  fontSize:'0.82rem',
                  background: 'linear-gradient(135deg,#10b981,#059669)',
                  color: '#fff',
                  border:'none',
                  opacity: 0.9,
                  cursor: 'default',
                }}
              >
                ✓ Sent
              </button>
            ) : (
              <button
                onClick={() => onMailHR(job)}
                className="button"
                type="button"
                style={{
                  padding:'0.45rem 1rem',
                  fontSize:'0.82rem',
                  background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                  color: '#fff',
                  border:'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                }}
                title="Send email application to HR with resume attached"
              >
                ✉️ Mail HR
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default JobCard;
