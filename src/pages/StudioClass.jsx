import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { useStudioClass } from '../hooks/useStudioClass.js';
import { useProfiles } from '../hooks/useProfiles.js';
import { useSettings } from '../hooks/useSettings.js';
import { supabase } from '../lib/supabase.js';
import { fmtDate, fmtTime } from '../lib/dateUtils.js';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import Pill from '../components/Pill.jsx';

export default function StudioClass() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { upcoming, past, piecesFor, loading, refetch } = useStudioClass();
  const { displayName } = useProfiles();
  const { settings } = useSettings();

  return (
    <>
      <PageHeader
        eyebrow="Weekly gathering"
        title="Studio class"
        subtitle={`Default: ${settings.studio_default_day || 'Tuesday'}s at ${(settings.studio_default_time || '19:30').slice(0, 5)}. Chi Ho may adjust for a given week.`}
      />

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">Loading…</p>
      ) : (
        <>
          <UpcomingSession
            session={upcoming}
            isAdmin={isAdmin}
            profile={profile}
            piecesFor={piecesFor}
            displayName={displayName}
            refetch={refetch}
          />

          <PastSessions
            past={past}
            piecesFor={piecesFor}
            displayName={displayName}
          />

          {isAdmin && <AdminCreateSession refetch={refetch} />}
        </>
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// Upcoming session card (with programme + sign-up)
// -----------------------------------------------------------------------------

function UpcomingSession({ session, isAdmin, profile, piecesFor, displayName, refetch }) {
  const [editSchedule, setEditSchedule] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [tempTime, setTempTime] = useState('');
  const [tempLocation, setTempLocation] = useState('');

  if (!session) {
    return (
      <div style={{
        border: '0.5px dashed var(--rule)',
        padding: 28,
        marginBottom: 40,
        borderRadius: 2,
        background: 'var(--paper)',
        textAlign: 'center',
        color: 'var(--ink-mute)',
        fontSize: 14,
      }}>
        <p className="font-serif" style={{ fontStyle: 'italic', margin: 0 }}>
          No upcoming studio class scheduled.
        </p>
        {isAdmin && <p style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
          Create one using the form below.
        </p>}
      </div>
    );
  }

  const openEditSchedule = () => {
    setTempDate(session.session_date);
    setTempTime(session.session_time.slice(0, 5));
    setTempLocation(session.location || '');
    setEditSchedule(true);
  };

  const saveSchedule = async () => {
    await supabase
      .from('studio_class')
      .update({ session_date: tempDate, session_time: tempTime, location: tempLocation })
      .eq('id', session.id);
    setEditSchedule(false);
    refetch();
  };

  const pieces = piecesFor(session.id);

  return (
    <div style={{
      border: '0.5px solid var(--rule)',
      padding: 28,
      marginBottom: 40,
      borderRadius: 2,
      background: 'var(--paper)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--ink-mute)',
            marginBottom: 6,
          }}>
            Next session
          </div>
          {!editSchedule ? (
            <>
              <div className="font-serif" style={{ fontSize: 26, fontStyle: 'italic', lineHeight: 1.1 }}>
                {fmtDate(session.session_date)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
                <span className="font-mono">{fmtTime(session.session_time)}</span>
                {session.location && <> · {session.location}</>}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="date" value={tempDate} onChange={e => setTempDate(e.target.value)}
                style={miniInput} />
              <input type="time" value={tempTime} onChange={e => setTempTime(e.target.value)}
                style={miniInput} />
              <input type="text" value={tempLocation} onChange={e => setTempLocation(e.target.value)}
                placeholder="Location" style={{ ...miniInput, width: 140 }} />
            </div>
          )}
        </div>
        {isAdmin && (
          editSchedule ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <Button onClick={saveSchedule} size="sm">Save</Button>
              <Button onClick={() => setEditSchedule(false)} variant="ghost" size="sm">Cancel</Button>
            </div>
          ) : (
            <Button onClick={openEditSchedule} variant="secondary" size="sm">Reschedule</Button>
          )
        )}
      </div>

      <div style={{ height: 1, background: 'var(--rule)', margin: '12px 0 20px' }} />
      <div style={{
        fontSize: 10,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--ink-mute)',
        marginBottom: 12,
      }}>
        Programme
      </div>

      <Programme
        pieces={pieces}
        displayName={displayName}
        canDelete={(p) => isAdmin || p.student_id === profile.id}
        refetch={refetch}
      />

      {!isAdmin && (
        <SignUpMyPiece sessionId={session.id} studentId={profile.id} refetch={refetch} />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Programme display (one row per piece)
// -----------------------------------------------------------------------------

function Programme({ pieces, displayName, canDelete, refetch }) {
  const [deletingId, setDeletingId] = useState(null);

  if (pieces.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">
        No pieces signed up yet.
      </p>
    );
  }

  const remove = async (pieceId) => {
    setDeletingId(pieceId);
    await supabase.from('studio_pieces').delete().eq('id', pieceId);
    setDeletingId(null);
    refetch();
  };

  return (
    <div>
      {pieces.map((p, i) => (
        <div key={p.id} style={{
          padding: '12px 0',
          borderBottom: i < pieces.length - 1 ? '0.5px solid var(--rule-soft)' : 'none',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, minWidth: 120, paddingTop: 2 }}>
            {displayName(p.student_id)}
          </div>
          <div className="font-serif" style={{
            flex: 1,
            fontSize: 15,
            fontStyle: 'italic',
            color: 'var(--ink-soft)',
            lineHeight: 1.4,
          }}>
            {p.piece}
          </div>
          {canDelete(p) && (
            <button
              onClick={() => remove(p.id)}
              disabled={deletingId === p.id}
              title="Remove this piece"
              style={{
                color: 'var(--ink-mute)',
                padding: 4,
                borderRadius: 2,
                flexShrink: 0,
              }}
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Student: add one of their own pieces (can add multiple)
// -----------------------------------------------------------------------------

function SignUpMyPiece({ sessionId, studentId, refetch }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    setBusy(true);
    await supabase.from('studio_pieces').insert({
      session_id: sessionId,
      student_id: studentId,
      piece: text.trim(),
    });
    setBusy(false);
    setText('');
    setAdding(false);
    refetch();
  };

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '0.5px solid var(--rule)' }}>
      {!adding ? (
        <Button onClick={() => setAdding(true)} variant="secondary" size="sm">
          <Plus size={13} strokeWidth={1.5} /> Add a piece
        </Button>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            placeholder="e.g. Chopin Ballade No. 4 in F minor"
            autoFocus
            style={{
              flex: 1,
              minWidth: 240,
              padding: '9px 12px',
              fontSize: 13,
              border: '1px solid var(--rule)',
              borderRadius: 2,
              background: 'transparent',
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
            }}
          />
          <Button onClick={save} size="sm" disabled={busy}>
            {busy ? '…' : 'Add'}
          </Button>
          <Button onClick={() => { setAdding(false); setText(''); }} variant="ghost" size="sm">Cancel</Button>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Past sessions (expandable list)
// -----------------------------------------------------------------------------

function PastSessions({ past, piecesFor, displayName }) {
  const [expanded, setExpanded] = useState(null);

  if (past.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="font-serif" style={{
        fontSize: 18,
        fontStyle: 'italic',
        fontWeight: 400,
        margin: '0 0 16px',
      }}>
        Past sessions
      </h2>
      <div style={{ border: '0.5px solid var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
        {past.map((session, i) => {
          const pieces = piecesFor(session.id);
          const isOpen = expanded === session.id;
          return (
            <div key={session.id} style={{ borderTop: i > 0 ? '0.5px solid var(--rule-soft)' : 'none' }}>
              <button
                onClick={() => setExpanded(isOpen ? null : session.id)}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  textAlign: 'left',
                  background: isOpen ? 'var(--paper-soft)' : 'transparent',
                  transition: 'background 120ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
                  <span className="font-serif" style={{ fontSize: 16, fontStyle: 'italic' }}>
                    {fmtDate(session.session_date)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
                    {pieces.length} piece{pieces.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen && (
                <div style={{ padding: '0 18px 18px' }}>
                  {pieces.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--ink-mute)', fontStyle: 'italic', margin: 0 }} className="font-serif">
                      No pieces recorded.
                    </p>
                  ) : pieces.map(p => (
                    <div key={p.id} style={{
                      padding: '8px 0',
                      display: 'flex',
                      gap: 14,
                      fontSize: 12.5,
                      borderTop: '0.5px solid var(--rule-soft)',
                    }}>
                      <span style={{ fontWeight: 500, minWidth: 110, color: 'var(--ink-soft)' }}>
                        {displayName(p.student_id)}
                      </span>
                      <span className="font-serif" style={{ fontStyle: 'italic', color: 'var(--ink-mute)' }}>
                        {p.piece}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Admin: create a new studio class session
// -----------------------------------------------------------------------------

function AdminCreateSession({ refetch }) {
  const { settings } = useSettings();
  const [date, setDate] = useState('');
  const [time, setTime] = useState((settings.studio_default_time || '19:30').slice(0, 5));
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const create = async () => {
    if (!date) { setErr('Pick a date.'); return; }
    setErr(null); setBusy(true);
    const { error } = await supabase.from('studio_class').insert({
      session_date: date,
      session_time: time,
      location: location.trim(),
    });
    setBusy(false);
    if (error) setErr(error.message);
    else {
      setDate('');
      setLocation('');
      refetch();
    }
  };

  return (
    <section style={{ marginTop: 56, paddingTop: 32, borderTop: '0.5px solid var(--rule)' }}>
      <h2 className="font-serif" style={{
        fontSize: 18,
        fontStyle: 'italic',
        fontWeight: 400,
        margin: '0 0 16px',
      }}>
        Create a new session
      </h2>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={miniInput} />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} style={miniInput} />
        <input type="text" value={location} onChange={e => setLocation(e.target.value)}
          placeholder="Location (e.g. MA 405)" style={{ ...miniInput, width: 180 }} />
        <Button onClick={create} size="sm" disabled={busy}>Create</Button>
      </div>
      {err && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 10 }}>{err}</div>}
    </section>
  );
}

const miniInput = {
  padding: '8px 10px',
  fontSize: 13,
  border: '1px solid var(--rule)',
  borderRadius: 2,
  background: 'transparent',
  color: 'var(--ink)',
};
