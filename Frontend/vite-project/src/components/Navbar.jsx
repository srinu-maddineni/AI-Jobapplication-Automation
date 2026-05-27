import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="navbar" style={{
      boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
      transition: 'box-shadow 0.3s ease',
    }}>
      <div className="navbar-brand">
        {/* Animated Logo */}
        <div className="brand-logo">✈️</div>
        <div>
          <div className="brand-title">JobPilot</div>
        </div>
        <span className="brand-subtitle">Beta</span>
      </div>

      <div className="navbar-actions">
        {/* Live pulse dot */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <span style={{
            display:'inline-block', width:8, height:8, borderRadius:'50%',
            background:'#10b981',
            boxShadow:'0 0 8px rgba(16,185,129,0.7)',
            animation:'pulse 2s ease-in-out infinite',
          }}/>
          <span style={{ fontSize:'0.78rem', color:'#475569', fontWeight:600 }}>Live</span>
        </div>

        {user && (
          <div className="navbar-user">
            <div className="navbar-avatar">{initials}</div>
            <span style={{ display:'none', fontSize:'0.88rem' }}>{user.name}</span>
          </div>
        )}

        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="button button-secondary"
          style={{ padding:'0.5rem 1.1rem', fontSize:'0.82rem' }}
        >
          ← Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;
