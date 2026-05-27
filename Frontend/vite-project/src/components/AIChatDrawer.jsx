import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import aiService from '../services/aiService';
import jobsService from '../services/jobsService';

/* ══════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════ */
const SOURCE_COLORS = {
  LinkedIn: { bg: '#e8f4fd', text: '#0077b5', dot: '#0077b5' },
  Indeed:   { bg: '#fff3e0', text: '#e05c00', dot: '#e05c00' },
  Naukri:   { bg: '#fce8e8', text: '#d32f2f', dot: '#d32f2f' },
  Unstop:   { bg: '#f3e8ff', text: '#7c3aed', dot: '#7c3aed' },
};

const NAV_MAP = [
  { keywords: ['application', 'applications', 'applied'],     path: '/applications', label: 'Applications', emoji: '📋' },
  { keywords: ['dashboard', 'home', 'overview'],              path: '/dashboard',    label: 'Dashboard',    emoji: '🏠' },
  { keywords: ['resume', 'cv', 'upload resume'],              path: '/resume',       label: 'Resume',       emoji: '📄' },
  { keywords: ['jobs', 'find jobs', 'job search'],            path: '/jobs',         label: 'Jobs',         emoji: '💼' },
  { keywords: ['saved', 'saved jobs', 'bookmarked'],          path: '/saved-jobs',   label: 'Saved Jobs',   emoji: '🔖' },
  { keywords: ['cover letter', 'coverletter'],                path: '/cover-letter', label: 'Cover Letter', emoji: '✉️'  },
];

const NAV_TRIGGERS = [
  'take me to','go to','open','navigate to','show me the','switch to',
  'bring me to','head to','jump to','take me',
];

function detectNavigation(text) {
  const q = text.toLowerCase().trim();
  const hasNavTrigger = NAV_TRIGGERS.some(t => q.includes(t));
  const hasPageWord   = q.includes('page') || q.includes('section') || q.includes('tab');
  if (!hasNavTrigger && !hasPageWord && !q.startsWith('go ') && !q.startsWith('open ')) return null;
  for (const nav of NAV_MAP) {
    if (nav.keywords.some(k => q.includes(k))) return nav;
  }
  return null;
}

function detectSync(text) {
  const q = text.toLowerCase();
  return ['sync', 'refresh', 'update jobs', 'fetch jobs', 'scrape'].some(t => q.includes(t));
}

/* ══════════════════════════════════════════════════════
   MARKDOWN PARSER
   ══════════════════════════════════════════════════════ */
function parseMarkdown(text) {
  if (!text) return null;
  const tokenRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|\n/g;
  const parts = [];
  let lastIdx = 0, match;
  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push({ type: 'text',   content: text.slice(lastIdx, match.index) });
    if      (match[1] !== undefined) parts.push({ type: 'link',   label: match[1], url: match[2] });
    else if (match[3] !== undefined) parts.push({ type: 'bold',   content: match[3] });
    else if (match[4] !== undefined) parts.push({ type: 'italic', content: match[4] });
    else                              parts.push({ type: 'br' });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) parts.push({ type: 'text', content: text.slice(lastIdx) });

  return parts.map((p, i) => {
    if (p.type === 'link')   return <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" style={{ color:'#4f46e5', fontWeight:600, textDecoration:'underline' }}>🔗 {p.label}</a>;
    if (p.type === 'bold')   return <strong key={i}>{p.content}</strong>;
    if (p.type === 'italic') return <em key={i} style={{ color:'#64748b', fontSize:'0.8rem', fontStyle:'normal' }}>{p.content}</em>;
    if (p.type === 'br')     return <br key={i} />;
    return <span key={i}>{p.content}</span>;
  });
}

/* ══════════════════════════════════════════════════════
   TIME UTILS
   ══════════════════════════════════════════════════════ */
function fmtDate(d) {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 60000);
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

/* ══════════════════════════════════════════════════════
   TYPING DOTS
   ══════════════════════════════════════════════════════ */
const THINKING = ['Thinking…', 'Searching jobs…', 'Checking database…', 'Analyzing…'];
function TypingDots({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ display:'flex', gap:4 }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width:7,height:7,borderRadius:'50%',
            background:'#4f46e5',opacity:0.7,
            animation:`chatDot 1.2s ${i*0.2}s infinite ease-in-out both`,
          }}/>
        ))}
      </div>
      <span style={{ fontSize:'0.78rem',color:'#64748b',fontStyle:'italic' }}>{label}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   JOB CARD (rich card inside chat)
   ══════════════════════════════════════════════════════ */
function ChatJobCard({ job, index, onTellMore }) {
  const url = job.applyUrlResolved || job.jobUrl;
  const sc  = SOURCE_COLORS[job.source] || { bg:'#f1f5f9', text:'#475569', dot:'#94a3b8' };
  const skills = (job.requiredSkills || []).slice(0,3);

  return (
    <div style={{
      border:'1px solid #e2e8f0',borderRadius:'0.85rem',
      padding:'0.75rem 0.85rem',background:'#fff',
      marginBottom:'0.5rem',
      boxShadow:'0 2px 8px rgba(0,0,0,0.04)',
      transition:'box-shadow 0.15s,transform 0.15s',
    }}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 16px rgba(79,70,229,0.12)';e.currentTarget.style.transform='translateY(-1px)';}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)';e.currentTarget.style.transform='';}}
    >
      {/* Top row */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.35rem' }}>
        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          <span style={{ width:7,height:7,borderRadius:'50%',background:sc.dot,flexShrink:0,display:'inline-block' }}/>
          <span style={{
            background:sc.bg,color:sc.text,
            fontSize:'0.68rem',fontWeight:700,
            padding:'0.12rem 0.5rem',borderRadius:'999px',
          }}>{job.source}</span>
          {job.remote && (
            <span style={{ background:'#f0fdf4',color:'#166534',fontSize:'0.65rem',fontWeight:700,padding:'0.1rem 0.45rem',borderRadius:'999px' }}>
              🏡 Remote
            </span>
          )}
        </div>
        <span style={{ fontSize:'0.7rem',color:'#94a3b8' }}>#{index+1} · {fmtDate(job.createdAt)}</span>
      </div>

      {/* Title */}
      <div style={{ fontWeight:700,fontSize:'0.85rem',color:'#0f172a',lineHeight:1.25,marginBottom:'0.18rem' }}>
        {job.title}
      </div>

      {/* Company + Location */}
      <div style={{ fontSize:'0.78rem',color:'#475569',marginBottom:'0.35rem' }}>
        🏢 {job.company}
        {job.location && <span style={{ marginLeft:6,color:'#94a3b8' }}>📍 {job.location}</span>}
      </div>

      {/* Salary */}
      {job.salary && (
        <div style={{ fontSize:'0.75rem',color:'#16a34a',fontWeight:600,marginBottom:'0.3rem' }}>
          💰 {job.salary}
        </div>
      )}

      {/* Match score badge */}
      {job.score > 0 && (
        <div style={{ fontSize:'0.72rem',color:'#7c3aed',fontWeight:600,marginBottom:'0.3rem' }}>
          🎯 {job.score} skill match{job.score > 1 ? 'es' : ''}
          {job.overlap && job.overlap.length > 0 && (
            <span style={{ color:'#94a3b8',fontWeight:400 }}> ({job.overlap.slice(0,3).join(', ')})</span>
          )}
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginBottom:'0.4rem' }}>
          {skills.map(s => (
            <span key={s} style={{
              background:'#f8fafc',border:'1px solid #e2e8f0',
              borderRadius:'999px',padding:'0.1rem 0.45rem',
              fontSize:'0.65rem',color:'#475569',fontWeight:500,
            }}>{s}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex',gap:6,marginTop:'0.3rem' }}>
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{
            flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,
            background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
            color:'#fff',borderRadius:'0.55rem',padding:'0.38rem 0',
            fontSize:'0.78rem',fontWeight:700,textDecoration:'none',
            boxShadow:'0 2px 8px rgba(79,70,229,0.28)',
            transition:'transform 0.12s,box-shadow 0.12s',
          }}
          onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 12px rgba(79,70,229,0.38)';}}
          onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 2px 8px rgba(79,70,229,0.28)';}}
        >→ Apply Now</a>
        <button onClick={() => onTellMore(index)}
          style={{
            background:'#f5f3ff',border:'1px solid #c7d2fe',color:'#4338ca',
            borderRadius:'0.55rem',padding:'0.38rem 0.7rem',
            fontSize:'0.75rem',fontWeight:600,cursor:'pointer',
            transition:'background 0.12s',
          }}
          onMouseEnter={e=>e.currentTarget.style.background='#ede9fe'}
          onMouseLeave={e=>e.currentTarget.style.background='#f5f3ff'}
          title="Ask bot for more details about this job"
        >📌 More</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MESSAGE BUBBLE
   ══════════════════════════════════════════════════════ */
function MessageBubble({ msg, lastJobs, onTellMore }) {
  const isUser = msg.role === 'user';
  const hasJobs = Array.isArray(msg.jobs) && msg.jobs.length > 0;

  return (
    <div style={{ marginBottom:'0.65rem', animation:'msgPop 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
      <div style={{ display:'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems:'flex-end', gap:'0.4rem' }}>
        {!isUser && (
          <div style={{
            width:27,height:27,borderRadius:'50%',flexShrink:0,
            background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.78rem',
            boxShadow:'0 2px 6px rgba(79,70,229,0.28)',
          }}>🤖</div>
        )}
        <div style={{
          maxWidth:'82%',
          padding:'0.6rem 0.85rem',
          borderRadius: isUser ? '1rem 1rem 0.2rem 1rem' : '1rem 1rem 1rem 0.2rem',
          background: isUser ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : msg.type==='nav' ? '#f0fdf4' : '#ffffff',
          color: isUser ? '#fff' : '#1e293b',
          fontSize:'0.84rem',lineHeight:1.55,
          boxShadow: isUser ? '0 3px 10px rgba(79,70,229,0.28)' : '0 2px 8px rgba(0,0,0,0.06)',
          border: isUser ? 'none' : msg.type==='nav' ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
          wordBreak:'break-word',
        }}>
          {msg.typing
            ? <TypingDots label={msg.thinkLabel || 'Thinking…'} />
            : parseMarkdown(msg.content)
          }
        </div>
      </div>

      {/* Job cards */}
      {hasJobs && (
        <div style={{ marginTop:'0.5rem', marginLeft:35 }}>
          {msg.jobs.map((job, i) => (
            <ChatJobCard key={job._id || i} job={job} index={i} onTellMore={onTellMore} />
          ))}
          {msg.jobs.length > 1 && (
            <div style={{ fontSize:'0.72rem',color:'#94a3b8',textAlign:'center',marginTop:'0.2rem' }}>
              💡 Say <em>"tell me more about job 2"</em> for details
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SUGGESTION CHIP
   ══════════════════════════════════════════════════════ */
function Chip({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      background:'#f5f3ff',border:'1.5px solid #c7d2fe',color:'#4338ca',
      borderRadius:'999px',padding:'0.3rem 0.7rem',fontSize:'0.73rem',
      fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.14s',
    }}
      onMouseEnter={e=>{e.currentTarget.style.background='#ede9fe';e.currentTarget.style.transform='translateY(-1px)';}}
      onMouseLeave={e=>{e.currentTarget.style.background='#f5f3ff';e.currentTarget.style.transform='';}}
    >{label}</button>
  );
}

/* ══════════════════════════════════════════════════════
   CONTEXT-AWARE SUGGESTIONS ENGINE
   ══════════════════════════════════════════════════════ */
function getSuggestions(text, hasJobs) {
  if (!text) return ['🆕 Latest jobs','💼 Match my resume','📊 Job stats','🏡 Remote jobs'];
  const t = text.toLowerCase();
  if (hasJobs) return ['📌 Tell me more about job 1','💼 Match to my resume','🔍 React jobs','📋 Applications page'];
  if (t.includes('match') || t.includes('skill')) return ['🆕 Latest jobs','🔄 Sync jobs','📄 Resume page','🔍 Python jobs'];
  if (t.includes('stats') || t.includes('total'))  return ['🆕 Latest jobs','🔄 Sync jobs','🏡 Remote jobs','💰 Salary jobs'];
  if (t.includes('sync') || t.includes('refresh')) return ['🆕 Latest jobs','💼 Match my resume','📊 Job stats'];
  if (t.includes('remote'))  return ['💼 Match my resume','🔍 React remote','💰 Salary info','🆕 All jobs'];
  if (t.includes('salary') || t.includes('pay'))   return ['💼 Match my resume','🏡 Remote jobs','🆕 Latest jobs'];
  return ['🆕 Latest jobs','💼 Match resume','🏡 Remote jobs','🔄 Sync jobs'];
}

/* ══════════════════════════════════════════════════════
   QUICK ACTION BAR
   ══════════════════════════════════════════════════════ */
const QUICK_ACTIONS = [
  { label:'🆕 New Jobs',    msg:'Show latest jobs'         },
  { label:'💼 Resume Fit',  msg:'Match my resume'          },
  { label:'🏡 Remote',      msg:'Show remote jobs'         },
  { label:'💰 With Salary', msg:'Show jobs with salary'    },
  { label:'📊 Stats',       msg:'Job stats breakdown'      },
  { label:'🔄 Sync',        msg:'Sync jobs'                },
];

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════ */
export default function AIChatDrawer() {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? '☀️ Good morning' : hour < 17 ? '🌤 Good afternoon' : '🌙 Good evening';

  const [open,        setOpen]        = useState(false);
  const [messages,    setMessages]    = useState([{
    role:'assistant',
    content:`${timeGreet}! I'm your **AI Job Assistant**.\n\nAsk about jobs, search by skill, or say *"take me to Applications"* to navigate.\n\n💡 Tip: Press **Ctrl+K** anytime to open me!`,
  }]);
  const [suggestions, setSuggestions] = useState(['🆕 Latest jobs','💼 Match my resume','🏡 Remote jobs','📊 Job stats']);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [syncing,     setSyncing]     = useState(false);
  const [error,       setError]       = useState('');
  const [unread,      setUnread]      = useState(0);
  const [totalJobs,   setTotalJobs]   = useState(null);
  const [lastJobs,    setLastJobs]    = useState([]);
  const [thinkLabel,  setThinkLabel]  = useState('Thinking…');

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Fetch live job count for header
  useEffect(() => {
    jobsService.getJobs({ limit:1 }).then(r => {
      const t = r?.total || r?.pagination?.total;
      if (t) setTotalJobs(t);
    }).catch(() => {});
  }, []);

  // Ctrl+K keyboard shortcut
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 280); }
  }, [open]);

  /* ── Sync handler ─────────────────────────────────── */
  const handleSync = useCallback(async () => {
    setSyncing(true);
    const syncMsg = { role:'assistant', type:'sync', content:'🔄 Syncing jobs from LinkedIn, Indeed, Naukri & Unstop…\n\nThis takes 30–60 seconds. I\'ll show the results when done!' };
    setMessages(prev => [...prev, syncMsg]);
    try {
      const res = await jobsService.syncJobs({});
      const n = res?.result?.totalIngested ?? 0;
      const d = res?.result?.totalDuplicates ?? 0;
      const reply = n > 0
        ? `✅ Sync complete! Added **${n} new jobs**. (${d} duplicates skipped)\n\nSay *"show latest jobs"* to see them!`
        : `✅ Sync complete. No new jobs found (${d} duplicates). Database is up to date!`;
      setMessages(prev => [...prev, { role:'assistant', content: reply }]);
      // Update job count
      setTotalJobs(prev => prev !== null ? prev + n : null);
    } catch {
      setMessages(prev => [...prev, { role:'assistant', content:'⚠️ Sync failed — the scraper may be rate-limited. Try again in a few minutes.' }]);
    } finally {
      setSyncing(false);
    }
  }, []);

  /* ── Tell me more handler ─────────────────────────── */
  const handleTellMore = useCallback((index) => {
    sendMessage(`Tell me more about job ${index + 1}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastJobs]);

  /* ── Core send ───────────────────────────────────── */
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading || syncing) return;

    setInput('');
    setError('');
    setSuggestions([]);

    const userMsg = { role:'user', content: trimmed };
    const thinkIdx = Math.floor(Math.random() * THINKING.length);
    const thinkingMsg = { role:'assistant', content:'', typing:true, thinkLabel: THINKING[thinkIdx] };

    setMessages(prev => [...prev, userMsg, thinkingMsg]);
    setLoading(true);
    setThinkLabel(THINKING[thinkIdx]);

    // 1. Check sync intent
    if (detectSync(trimmed)) {
      setMessages(prev => prev.slice(0, -1)); // remove typing
      setLoading(false);
      handleSync();
      return;
    }

    // 2. Check navigation intent
    const navTarget = detectNavigation(trimmed);
    if (navTarget) {
      await new Promise(r => setTimeout(r, 350));
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role:'assistant', type:'nav', content:`✅ Navigating to **${navTarget.emoji} ${navTarget.label}**…` },
      ]);
      setSuggestions(['🆕 Latest jobs','💼 Match resume','📊 Job stats']);
      setLoading(false);
      setTimeout(() => navigate(navTarget.path), 550);
      return;
    }

    // 3. Call backend
    try {
      const res = await aiService.chat(trimmed, [], lastJobs);
      const reply  = res?.text ?? '';
      const jobs   = Array.isArray(res?.jobs) ? res.jobs : [];
      const action = res?.action;

      // Handle special actions from backend
      if (action === 'SYNC_JOBS') {
        setMessages(prev => prev.slice(0, -1));
        setLoading(false);
        handleSync();
        return;
      }

      if (jobs.length > 0) setLastJobs(jobs);

      setMessages(prev => [
        ...prev.slice(0, -1),
        { role:'assistant', content: reply || '', jobs: jobs.length > 0 ? jobs : undefined },
      ]);
      setSuggestions(getSuggestions(reply, jobs.length > 0));
      if (!open) setUnread(u => u + 1);
    } catch (err) {
      const errMsg = err?.response?.data?.message || 'Could not reach the server.';
      setError(errMsg);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [input, loading, syncing, navigate, open, lastJobs, handleSync]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleChip = (label) => {
    const clean = label.replace(/^[\p{Emoji}\s]+/u, '').trim();
    sendMessage(clean || label);
  };

  const clearChat = () => {
    setMessages([{ role:'assistant', content:`${timeGreet}! Chat cleared. How can I help you?` }]);
    setSuggestions(['🆕 Latest jobs','💼 Match my resume','🏡 Remote jobs','📊 Job stats']);
    setLastJobs([]);
    setError('');
  };

  return (
    <>
      <style>{`
        @keyframes chatDot {
          0%,80%,100% { transform:scale(0.55);opacity:0.35 }
          40%          { transform:scale(1);  opacity:1    }
        }
        @keyframes msgPop {
          from { opacity:0;transform:scale(0.93) translateY(5px) }
          to   { opacity:1;transform:scale(1)    translateY(0)   }
        }
        @keyframes fabPulse {
          0%,100% { box-shadow:0 4px 18px rgba(79,70,229,0.4) }
          50%     { box-shadow:0 6px 28px rgba(79,70,229,0.7) }
        }
        @keyframes drawerIn {
          from { opacity:0;transform:translateY(16px) scale(0.96) }
          to   { opacity:1;transform:translateY(0)    scale(1)    }
        }
        .ai-drawer-panel { animation: drawerIn 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        #chat-messages-area::-webkit-scrollbar { width:4px }
        #chat-messages-area::-webkit-scrollbar-thumb { background:#e2e8f0;border-radius:4px }
        .ai-quick-bar::-webkit-scrollbar { display:none }
      `}</style>

      {/* ── FAB ──────────────────────────────────────────── */}
      <button id="ai-chat-fab" onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close AI Assistant' : 'Open AI Assistant (Ctrl+K)'}
        title={open ? 'Close' : 'AI Assistant (Ctrl+K)'}
        style={{
          position:'fixed',bottom:'1.75rem',right:'1.75rem',zIndex:9999,
          width:58,height:58,borderRadius:'50%',border:'none',cursor:'pointer',
          background: open ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize: open ? '1.25rem' : '1.5rem',
          animation: open ? 'none' : 'fabPulse 2.6s ease-in-out infinite',
          boxShadow:'0 4px 18px rgba(79,70,229,0.4)',
          transition:'transform 0.18s,background 0.18s',
        }}
        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
        onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
      >
        {open ? '✕' : '🤖'}
        {!open && unread > 0 && (
          <span style={{
            position:'absolute',top:0,right:0,
            width:20,height:20,borderRadius:'50%',
            background:'#ef4444',color:'#fff',
            fontSize:'0.68rem',fontWeight:700,
            display:'flex',alignItems:'center',justifyContent:'center',
            border:'2.5px solid #fff',
          }}>{unread}</span>
        )}
      </button>

      {/* ── Drawer ───────────────────────────────────────── */}
      {open && (
        <div className="ai-drawer-panel" style={{
          position:'fixed',bottom:'5.25rem',right:'1.75rem',zIndex:9998,
          width:390,maxWidth:'calc(100vw - 2rem)',
          height:600,maxHeight:'calc(100vh - 7rem)',
          display:'flex',flexDirection:'column',borderRadius:'1.3rem',overflow:'hidden',
          background:'rgba(255,255,255,0.98)',backdropFilter:'blur(24px)',
          border:'1px solid rgba(79,70,229,0.13)',
          boxShadow:'0 30px 70px -12px rgba(0,0,0,0.18),0 8px 20px -6px rgba(79,70,229,0.1)',
        }}>

          {/* Header */}
          <div style={{
            padding:'0.85rem 1rem',flexShrink:0,
            background:'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)',
            display:'flex',alignItems:'center',gap:'0.65rem',
          }}>
            <div style={{
              width:36,height:36,borderRadius:'50%',flexShrink:0,
              background:'rgba(255,255,255,0.18)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',
            }}>🤖</div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ color:'#fff',fontWeight:700,fontSize:'0.88rem',lineHeight:1.2 }}>
                AI Job Assistant
                {totalJobs !== null && (
                  <span style={{
                    marginLeft:8,background:'rgba(255,255,255,0.2)',
                    color:'rgba(255,255,255,0.9)',fontSize:'0.65rem',fontWeight:600,
                    padding:'0.08rem 0.45rem',borderRadius:'999px',verticalAlign:'middle',
                  }}>{totalJobs} jobs</span>
                )}
              </div>
              <div style={{ color:'rgba(255,255,255,0.72)',fontSize:'0.7rem' }}>
                {loading||syncing ? (syncing ? '🔄 Syncing…' : `⌛ ${thinkLabel}`) : 'Ask · Search · Navigate'}
              </div>
            </div>
            {/* Clear & Close buttons */}
            <button onClick={clearChat} title="Clear chat"
              style={{ background:'rgba(255,255,255,0.12)',border:'none',color:'rgba(255,255,255,0.8)',borderRadius:'0.45rem',width:28,height:28,cursor:'pointer',fontSize:'0.75rem',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background 0.14s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.25)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'}
            >🗑</button>
            <button onClick={() => setOpen(false)} aria-label="Close"
              style={{ background:'rgba(255,255,255,0.12)',border:'none',color:'#fff',borderRadius:'50%',width:28,height:28,cursor:'pointer',fontSize:'0.8rem',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background 0.14s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.25)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'}
            >✕</button>
          </div>

          {/* Quick action bar */}
          <div className="ai-quick-bar" style={{
            display:'flex',gap:'0.4rem',padding:'0.5rem 0.8rem',
            borderBottom:'1px solid #f1f5f9',background:'#fafaff',
            overflowX:'auto',flexShrink:0,scrollbarWidth:'none',
          }}>
            {QUICK_ACTIONS.map(a => (
              <button key={a.label} onClick={() => sendMessage(a.msg)} disabled={loading||syncing}
                style={{
                  background:'#ede9fe',border:'1px solid #c7d2fe',color:'#4338ca',
                  borderRadius:'999px',padding:'0.26rem 0.65rem',
                  fontSize:'0.7rem',fontWeight:700,cursor:'pointer',
                  whiteSpace:'nowrap',flexShrink:0,
                  transition:'all 0.13s',opacity:loading||syncing?0.5:1,
                }}
                onMouseEnter={e=>{if(!loading&&!syncing){e.currentTarget.style.background='#ddd6fe';e.currentTarget.style.transform='translateY(-1px)';}}}
                onMouseLeave={e=>{e.currentTarget.style.background='#ede9fe';e.currentTarget.style.transform='';}}
              >{a.label}</button>
            ))}
          </div>

          {/* Messages */}
          <div id="chat-messages-area" style={{
            flex:1,overflowY:'auto',padding:'0.9rem 0.85rem 0.4rem',
            display:'flex',flexDirection:'column',
            scrollbarWidth:'thin',scrollbarColor:'#e2e8f0 transparent',
          }}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} lastJobs={lastJobs} onTellMore={handleTellMore} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Suggestion chips */}
          {suggestions.length > 0 && !loading && !syncing && (
            <div style={{
              padding:'0.4rem 0.85rem 0.35rem',
              display:'flex',flexWrap:'wrap',gap:'0.35rem',flexShrink:0,
              borderTop:'1px solid #f1f5f9',
            }}>
              {suggestions.map(s => <Chip key={s} label={s} onClick={() => handleChip(s)} />)}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              margin:'0 0.85rem 0.4rem',padding:'0.45rem 0.75rem',
              borderRadius:'0.6rem',background:'#fef2f2',
              border:'1px solid #fecaca',color:'#b91c1c',
              fontSize:'0.78rem',flexShrink:0,
            }}>⚠️ {error}</div>
          )}

          {/* Input row */}
          <div style={{
            padding:'0.6rem 0.85rem',borderTop:'1px solid #e2e8f0',
            display:'flex',gap:'0.5rem',alignItems:'flex-end',
            background:'#fafbff',flexShrink:0,
          }}>
            <textarea ref={inputRef} id="chat-input" rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Ask anything… "React jobs", "sync", "go to dashboard"'
              disabled={loading||syncing}
              style={{
                flex:1,resize:'none',border:'1.5px solid #e2e8f0',
                borderRadius:'0.75rem',padding:'0.55rem 0.8rem',
                fontSize:'0.83rem',lineHeight:1.4,outline:'none',
                background:'#fff',color:'#1e293b',
                boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
                transition:'border-color 0.14s',maxHeight:80,overflowY:'auto',
              }}
              onFocus={e=>e.target.style.borderColor='#818cf8'}
              onBlur={e=>e.target.style.borderColor='#e2e8f0'}
            />
            <button id="chat-send-btn" onClick={() => sendMessage()} disabled={loading||syncing||!input.trim()}
              aria-label="Send"
              style={{
                width:38,height:38,borderRadius:'50%',border:'none',flexShrink:0,
                background: loading||syncing||!input.trim() ? '#e2e8f0' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                cursor: loading||syncing||!input.trim() ? 'not-allowed' : 'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',
                transition:'all 0.14s',
                boxShadow: loading||syncing||!input.trim() ? 'none' : '0 3px 10px rgba(79,70,229,0.3)',
              }}
              onMouseEnter={e=>{if(!loading&&!syncing&&input.trim())e.currentTarget.style.transform='scale(1.1)';}}
              onMouseLeave={e=>e.currentTarget.style.transform=''}
            >{loading||syncing ? '⏳' : '➤'}</button>
          </div>
        </div>
      )}
    </>
  );
}
