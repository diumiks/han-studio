import { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import Button from '../components/Button.jsx';

// Three modes: 'signin', 'signup', 'reset'
export default function Login() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const clear = () => { setError(null); setMessage(null); };

  const handleSignIn = async () => {
    clear();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
  };

  const handleSignUp = async () => {
    clear();
    if (!fullName.trim()) { setError('Please enter your full name.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setMessage('Check your email to confirm your account. Once confirmed, come back and sign in.');
  };

  const handleReset = async () => {
    clear();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login',
    });
    setBusy(false);
    if (error) setError(error.message);
    else setMessage('If that email exists, a password reset link has been sent.');
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (mode === 'signin') handleSignIn();
    else if (mode === 'signup') handleSignUp();
    else handleReset();
  };

  const titles = {
    signin: 'Sign in',
    signup: 'Create account',
    reset: 'Reset password',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--paper)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Masthead */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            fontSize: 10,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: 'var(--ink-mute)',
            marginBottom: 20,
          }}>
            Indiana University · Jacobs School of Music
          </div>
          <h1 className="font-serif" style={{
            fontSize: 48,
            fontWeight: 400,
            margin: 0,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            fontStyle: 'italic',
          }}>
            The Han Studio
          </h1>
          <div style={{
            width: 32,
            height: 1,
            background: 'var(--ink)',
            margin: '20px auto',
          }} />
          <div style={{
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
          }}>
            Lesson Scheduling
          </div>
        </div>

        <div className="anim-fade">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 className="font-serif" style={{
              fontSize: 20,
              fontStyle: 'italic',
              fontWeight: 400,
              margin: 0,
            }}>
              {titles[mode]}
            </h2>
            {mode !== 'signin' && (
              <button onClick={() => { clear(); setMode('signin'); }} style={{
                fontSize: 11,
                color: 'var(--ink-mute)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <ArrowLeft size={12} strokeWidth={1.5} /> Back
              </button>
            )}
          </div>

          <form onSubmit={onSubmit}>
            {mode === 'signup' && (
              <Field label="Full name">
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your name as you'd like it to appear"
                  autoComplete="name"
                  style={inputStyle}
                />
              </Field>
            )}

            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@iu.edu"
                autoComplete="email"
                required
                style={inputStyle}
              />
            </Field>

            {mode !== 'reset' && (
              <Field label="Password">
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  style={inputStyle}
                />
              </Field>
            )}

            {error && (
              <div style={{
                fontSize: 12.5,
                color: 'var(--accent)',
                background: '#F5E1DC',
                padding: '10px 12px',
                border: '0.5px solid #E0BAB0',
                borderRadius: 2,
                marginBottom: 14,
              }}>
                {error}
              </div>
            )}

            {message && (
              <div style={{
                fontSize: 12.5,
                color: 'var(--green)',
                background: 'var(--green-soft)',
                padding: '10px 12px',
                border: '0.5px solid #B5C5BC',
                borderRadius: 2,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}>
                <Mail size={13} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{message}</span>
              </div>
            )}

            <Button type="submit" size="lg" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </Button>
          </form>

          <div style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: '0.5px solid var(--rule)',
            fontSize: 12,
            color: 'var(--ink-mute)',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}>
            {mode === 'signin' ? (
              <>
                <button onClick={() => { clear(); setMode('signup'); }} style={linkStyle}>
                  Create an account
                </button>
                <button onClick={() => { clear(); setMode('reset'); }} style={linkStyle}>
                  Forgot password?
                </button>
              </>
            ) : (
              <button onClick={() => { clear(); setMode('signin'); }} style={linkStyle}>
                Already have an account? Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  fontSize: 14,
  background: 'transparent',
  border: '1px solid var(--rule)',
  borderRadius: 2,
  outline: 'none',
};

const linkStyle = {
  color: 'var(--ink-soft)',
  textDecoration: 'underline',
  textDecorationColor: 'var(--rule)',
  textUnderlineOffset: 3,
  fontSize: 12,
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block',
        fontSize: 11,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--ink-soft)',
        marginBottom: 8,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}
