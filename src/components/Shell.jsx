import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Clock, Users, BookOpen, FileText, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';

export default function Shell({ children }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = profile?.role === 'admin';

  const studentNav = [
    { to: '/book', label: 'Book a lesson', icon: Calendar },
    { to: '/my-lessons', label: 'My lessons', icon: Clock },
    { to: '/studio-class', label: 'Studio class', icon: Users },
    { to: '/policy', label: 'Announcements', icon: FileText },
  ];
  const adminNav = [
    { to: '/schedule', label: 'Schedule', icon: Calendar },
    { to: '/open-slots', label: 'Open slots', icon: Plus },
    { to: '/studio-class', label: 'Studio class', icon: Users },
    { to: '/students', label: 'Students', icon: BookOpen },
    { to: '/policy', label: 'Announcements', icon: FileText },
  ];
  const nav = isAdmin ? adminNav : studentNav;

  return (
    <div className="responsive-shell" style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <aside className="responsive-sidebar hover-sidebar">
        <div className="hover-sidebar-inner">
          <div className="responsive-sidebar-brand" style={{ paddingBottom: 4 }}>
            <div className="hover-sidebar-brand-full">
              <div style={{
                fontSize: 9,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'var(--ink-mute)',
                marginBottom: 6,
                whiteSpace: 'nowrap',
              }}>
                Jacobs · Piano
              </div>
              <div className="font-serif responsive-sidebar-brand-title" style={{
                fontSize: 22,
                fontStyle: 'italic',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}>
                The Han<br />Studio
              </div>
            </div>
            <div className="hover-sidebar-brand-mini font-serif" aria-hidden="true">
              H
            </div>
            <div className="responsive-sidebar-rule" style={{ height: 1, background: 'var(--ink)', margin: '20px 0 0', width: 24 }} />
          </div>

          <nav className="responsive-nav hover-sidebar-nav">
            {nav.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.to || (item.to === '/students' && location.pathname.startsWith('/students/'));
              return (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="hover-sidebar-navbtn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '10px 14px',
                    marginBottom: 2,
                    fontSize: 13,
                    color: active ? 'var(--ink)' : 'var(--ink-soft)',
                    fontWeight: active ? 500 : 400,
                    borderRadius: 2,
                    background: active ? 'var(--paper-soft)' : 'transparent',
                    transition: 'background 120ms ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--paper-soft)'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? 'var(--paper-soft)' : 'transparent'; }}
                  title={item.label}
                >
                  <Icon size={16} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <span className="hover-sidebar-navlabel">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="responsive-sidebar-footer hover-sidebar-footer" style={{ borderTop: '0.5px solid var(--rule)', paddingTop: 20 }}>
            <div className="hover-sidebar-footer-info">
              <div style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ink-mute)',
                marginBottom: 6,
              }}>
                Signed in as
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                {profile?.full_name || profile?.email?.split('@')[0]}
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--ink-mute)',
                marginBottom: 16,
                wordBreak: 'break-all',
              }}>
                {isAdmin ? 'Studio faculty' : profile?.email}
              </div>
            </div>
            <button onClick={signOut} className="hover-sidebar-signout" style={{
              fontSize: 11,
              color: 'var(--ink-mute)',
              padding: '6px 10px',
              border: '0.5px solid var(--rule)',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              flexShrink: 0,
            }} title="Sign out">
              <LogOut size={13} strokeWidth={1.5} />
              <span className="hover-sidebar-navlabel">Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="responsive-main" style={{ minWidth: 0, padding: '48px 56px 80px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
