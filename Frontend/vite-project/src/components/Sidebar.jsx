import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard',    path: '/dashboard',    icon: '🏠', emoji: true },
  { label: 'Resume',       path: '/resume',        icon: '📄', emoji: true },
  { label: 'Jobs',         path: '/jobs',          icon: '💼', emoji: true },
  { label: 'Saved Jobs',   path: '/saved-jobs',    icon: '🔖', emoji: true },
  { label: 'Applications', path: '/applications',  icon: '📋', emoji: true },
  { label: 'Cover Letter', path: '/cover-letter',  icon: '✉️',  emoji: true },
  { label: 'Credentials',  path: '/credentials',   icon: '🔑',  emoji: true },
];

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''}`
            }
            title={item.label}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom divider + hint */}
      <div style={{
        marginTop:'auto',
        padding:'1rem 0.5rem 0',
        borderTop:'1px solid var(--border)',
        width:'100%',
        display:'flex',
        justifyContent:'center',
      }}>
        <span title="Hover to expand" style={{
          fontSize:'0.6rem',
          color:'var(--text-muted)',
          fontWeight:600,
          textAlign:'center',
          letterSpacing:'0.05em',
          whiteSpace:'nowrap',
          overflow:'hidden',
          textOverflow:'ellipsis',
          width:'100%',
          padding:'0 0.5rem',
        }}>hover to expand</span>
      </div>
    </aside>
  );
};

export default Sidebar;
