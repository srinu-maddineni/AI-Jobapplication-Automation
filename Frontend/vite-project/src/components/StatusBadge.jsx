const StatusBadge = ({ status, score }) => {
  const label = status || (score >= 75 ? '🔥 High Match' : score >= 40 ? '⚡ Good Match' : '🔵 Low Match');

  let style = {};

  if (status) {
    const s = status.toLowerCase();
    if (s.includes('submitted') || s.includes('applied') || s.includes('completed')) {
      style = { background:'rgba(16,185,129,0.12)', color:'#10b981', border:'1px solid rgba(16,185,129,0.25)' };
    } else if (s.includes('rejected') || s.includes('failed') || s.includes('blocked')) {
      style = { background:'rgba(244,63,94,0.12)', color:'#f43f5e', border:'1px solid rgba(244,63,94,0.25)' };
    } else if (s.includes('progress') || s.includes('pending') || s.includes('retry') || s.includes('captcha') || s.includes('manual') || s.includes('action')) {
      style = { background:'rgba(245,158,11,0.12)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.25)' };
    } else if (s.includes('copilot') || s.includes('pilot')) {
      style = { background:'rgba(139,92,246,0.12)', color:'#8b5cf6', border:'1px solid rgba(139,92,246,0.25)' };
    } else {
      style = { background:'rgba(255,255,255,0.06)', color:'#94a3b8', border:'1px solid rgba(255,255,255,0.1)' };
    }
  } else {
    if (score >= 75) {
      style = { background:'rgba(16,185,129,0.12)', color:'#10b981', border:'1px solid rgba(16,185,129,0.25)' };
    } else if (score >= 40) {
      style = { background:'rgba(99,102,241,0.12)', color:'#6366f1', border:'1px solid rgba(99,102,241,0.25)' };
    } else {
      style = { background:'rgba(255,255,255,0.06)', color:'#64748b', border:'1px solid rgba(255,255,255,0.08)' };
    }
  }

  return (
    <span style={{
      ...style,
      display:'inline-flex', alignItems:'center',
      padding:'0.3rem 0.7rem',
      borderRadius:'999px',
      fontSize:'0.72rem',
      fontWeight:700,
      whiteSpace:'nowrap',
      flexShrink:0,
    }}>
      {label}
      {score !== undefined && !status && (
        <span style={{ marginLeft:'0.35rem', opacity:0.7, fontSize:'0.68rem' }}>{score}%</span>
      )}
    </span>
  );
};

export default StatusBadge;
