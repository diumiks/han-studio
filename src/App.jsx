import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import Shell from './components/Shell.jsx';
import Login from './pages/Login.jsx';

import Book from './pages/student/Book.jsx';
import MyLessons from './pages/student/MyLessons.jsx';
import Policy from './pages/student/Policy.jsx';

import Schedule from './pages/admin/Schedule.jsx';
import OpenSlots from './pages/admin/OpenSlots.jsx';
import Students from './pages/admin/Students.jsx';
import StudentDetail from './pages/admin/StudentDetail.jsx';

import StudioClass from './pages/StudioClass.jsx';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--paper)',
    }}>
      <div className="font-serif" style={{
        fontSize: 14,
        fontStyle: 'italic',
        color: 'var(--ink-mute)',
      }}>
        Loading…
      </div>
    </div>
  );
}

function Protected({ children, adminOnly = false }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!profile) return <LoadingScreen />;
  if (adminOnly && profile.role !== 'admin') return <Navigate to="/book" replace />;

  return <Shell>{children}</Shell>;
}

function RoleRedirect() {
  const { profile, loading } = useAuth();
  if (loading || !profile) return <LoadingScreen />;
  return <Navigate to={profile.role === 'admin' ? '/schedule' : '/book'} replace />;
}

function AppRoutes() {
  const { session, profile, loading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        session && profile ? <Navigate to="/" replace /> : <Login />
      } />

      {/* Student */}
      <Route path="/book" element={<Protected><Book /></Protected>} />
      <Route path="/my-lessons" element={<Protected><MyLessons /></Protected>} />

      {/* Shared */}
      <Route path="/studio-class" element={<Protected><StudioClass /></Protected>} />
      <Route path="/policy" element={<Protected><Policy /></Protected>} />

      {/* Admin */}
      <Route path="/schedule" element={<Protected adminOnly><Schedule /></Protected>} />
      <Route path="/open-slots" element={<Protected adminOnly><OpenSlots /></Protected>} />
      <Route path="/students" element={<Protected adminOnly><Students /></Protected>} />
      <Route path="/students/:id" element={<Protected adminOnly><StudentDetail /></Protected>} />

      {/* Root redirects based on role */}
      <Route path="/" element={
        !session ? <Navigate to="/login" replace /> : <RoleRedirect />
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
