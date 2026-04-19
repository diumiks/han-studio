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
    <div className="responsive-shell" style={{ minHeight: '100vh', display: 'flex', background: 'var(--paper)' }}>
      <aside className="responsive-sidebar" style={{
        width: 240,
        borderRight: '0.5px solid var(--rule)',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        flexShrink: 0,
      }}>
        <div className="responsive-sidebar-brand">
          <div>
            <div style={{
              fontSize: 9,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'var(--ink-mute)',
              marginBottom: 6,
            }}>
              Jacobs · Piano
            </div>
            <div className="font-serif responsive-sidebar-brand-title" style={{
              fontSize: 22,
              fontStyle: 'italic',
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
            }}>
              The Han<br />Studio
            </div>
          </div>
          <div className="responsive-sidebar-rule" style={{ height: 1, background: 'var(--ink)', margin: '20px 0 0', width: 24 }} />
        </div>

        <nav className="responsive-nav" style={{ marginTop: 36, flex: 1 }}>
          {nav.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '9px 10px',
                  marginBottom: 2,
                  fontSize: 13,
                  color: active ? 'var(--ink)' : 'var(--ink-soft)',
                  fontWeight: active ? 500 : 400,
                  borderRadius: 2,
                  background: active ? 'var(--paper-soft)' : 'transparent',
                  transition: 'all 120ms ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--paper-soft)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={15} strokeWidth={1.5} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="responsive-sidebar-footer" style={{ borderTop: '0.5px solid var(--rule)', paddingTop: 20 }}>
          <div>
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
          <button onClick={signOut} style={{
            fontSize: 11,
            color: 'var(--ink-mute)',
            padding: '4px 8px',
            border: '0.5px solid var(--rule)',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
          }}>
            <LogOut size={12} strokeWidth={1.5} /> Sign out
          </button>
        </div>
      </aside>

      <main className="responsive-main" style={{ flex: 1, overflow: 'auto', minWidth: 0, padding: '48px 56px 80px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
