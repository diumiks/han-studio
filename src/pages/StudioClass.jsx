import { useState } from 'react';
import { Plus, X, Ban, Undo2 } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { useStudioClass } from '../hooks/useStudioClass.js';
import { useProfiles } from '../hooks/useProfiles.js';
import { useSettings } from '../hooks/useSettings.js';
import { supabase } from '../lib/supabase.js';
import { fmtDate, fmtTime, todayISO } from '../lib/dateUtils.js';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Compute the next occurrence (YYYY-MM-DD) of the given weekday name, strictly after today.
function nextOccurrenceOf(dayName) {
  const targetDow = DAYS.indexOf(dayName);
  if (targetDow < 0) return null;
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const today = d.getDay();
  let offset = (targetDow - today + 7) % 7;
  if (offset === 0) offset = 7; // always the next upcoming one, not today
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function StudioClass() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { upcoming, upcomingList, past, piecesFor, loading, refetch } = useStudioClass();
  const { displayName } = useProfiles();
  const { settings } = useSettings();

  const defaultDay = settings.studio_default_day || 'Tuesday';
  const defaultTime = settings.studio_default_time || '19:30';

  // Show a virtual "next default" only if no explicit upcoming session exists,
  // OR the next explicit session is further out than the next default would be.
  const virtualDate = (() => {
    const computed = nextOccurrenceOf(defaultDay);
    if (!computed) return null;
    if (!upcoming) return computed;
    // If admin has already scheduled something sooner than (or equal to) the next
    // default occurrence, don't show the virtual card.
    return computed < upcoming.session_date ? computed : null;
  })();

  return (
    <>
      <PageHeader
        eyebrow="Weekly gathering"
        title="Studio class"
        subtitle={`Default: ${defaultDay}s at ${defaultTime.slice(0, 5)}. Chi Ho may adjust for a given week.`}
      />

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">Loading…</p>
      ) : (
        <>
          {virtualDate && (
            <VirtualSession
              date={virtualDate}
              time={defaultTime}
              isAdmin={isAdmin}
              refetch={refetch}
            />
          )}

          {upcomingList.length > 0 ? (
            upcomingList.map((s) => (
              <UpcomingSession
                key={s.id}
                session={s}
                isAdmin={isAdmin}
                profile={profile}
                piecesFor={piecesFor}
                displayName={displayName}
                refetch={refetch}
              />
            ))
          ) : !virtualDate ? (
            <EmptyCard isAdmin={isAdmin} />
          ) : null}

          <PastSessions
            past={past}
            piecesFor={piecesFor}
            displayName={displayName}
          />

          {isAdmin && <AdminCreateSession refetch={refetch} />}
          {isAdmin && <AdminDefaults />}
        </>
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// Empty state (no defaults set, no session scheduled)
// -----------------------------------------------------------------------------

function EmptyCard({ isAdmin }) {
  return (
    <div style={dashedCard}>
      <p className="font-serif" style={{ fontStyle: 'italic', margin: 0 }}>
        No upcoming studio class scheduled.
      </p>
      {isAdmin && <p style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
        Set a default day/time below, or create a one-off session.
      </p>}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Virtual session — computed from defaults when no real row exists yet.
// -----------------------------------------------------------------------------

function VirtualSession({ date, time, isAdmin, refetch }) {
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    await supabase.from('studio_class').insert({
      session_date: date,
      session_time: time,
      location: '',
    });
    setBusy(false);
    refetch();
  };

  return (
    <div style={{
      border: '0.5px dashed var(--rule)',
      padding: 28,
      marginBottom: 40,
      borderRadius: 2,
      background: 'var(--paper)',
    }}>
      <div style={{
        fontSize: 10,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--ink-mute)',
        marginBottom: 6,
      }}>
        Next session · from defaults
      </div>
      <div className="font-serif" style={{ fontSize: 26, fontStyle: 'italic', lineHeight: 1.1 }}>
        {fmtDate(date)}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
        <span className="font-mono">{fmtTime(time)}</span>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', fontStyle: 'italic', marginTop: 16, marginBottom: isAdmin ? 14 : 0 }} className="font-serif">
        {isAdmin
          ? 'Open this session to allow students to sign up pieces, or change the default below.'
          : 'Chi Ho will open this session soon. Sign-ups will appear here.'}
      </p>
      {isAdmin && (
        <Button onClick={open} size="sm" disabled={busy}>
          {busy ? 'Opening…' : 'Open this session'}
        </Button>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Upcoming session card (with programme + sign-up + cancel)
// -----------------------------------------------------------------------------

function UpcomingSession({ session, isAdmin, profile, piecesFor, displayName, refetch }) {
  const [editSchedule, setEditSchedule] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [tempTime, setTempTime] = useState('');
  const [tempLocation, setTempLocation] = useState('');

  const openEditSchedule = () => {
    setTempDate(session.session_date);
    setTempTime((session.session_time || '19:30').slice(0, 5));
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

  const toggleCancel = async () => {
    const next = !session.cancelled;
    const msg = next
      ? 'Cancel this studio class? Students will see it marked as cancelled.'
      : 'Un-cancel this studio class?';
    if (!confirm(msg)) return;
    await supabase.from('studio_class').update({ cancelled: next }).eq('id', session.id);
    refetch();
  };

  const removeSession = async () => {
    if (!confirm('Delete this session entirely? All piece sign-ups will be removed.')) return;
    await supabase.from('studio_class').delete().eq('id', session.id);
    refetch();
  };

  const pieces = piecesFor(session.id);
  const cancelled = session.cancelled;

  return (
    <div style={{
      border: '0.5px solid var(--rule)',
      padding: 28,
      marginBottom: 40,
      borderRadius: 2,
      background: 'var(--paper)',
      opacity: cancelled ? 0.72 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: cancelled ? 'var(--accent)' : 'var(--ink-mute)',
            marginBottom: 6,
          }}>
            {cancelled ? 'Cancelled' : 'Next session'}
          </div>
          {!editSchedule ? (
            <>
              <div className="font-serif" style={{
                fontSize: 26,
                fontStyle: 'italic',
                lineHeight: 1.1,
                textDecoration: cancelled ? 'line-through' : 'none',
              }}>
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
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Button onClick={openEditSchedule} variant="secondary" size="sm">Reschedule</Button>
              <Button onClick={toggleCancel} variant="ghost" size="sm">
                {cancelled ? (
                  <><Undo2 size={12} strokeWidth={1.5} /> Un-cancel</>
                ) : (
                  <><Ban size={12} strokeWidth={1.5} /> Cancel</>
                )}
              </Button>
              <Button onClick={removeSession} variant="ghost" size="sm">Delete</Button>
            </div>
          )
        )}
      </div>

      {cancelled ? (
        <p className="font-serif" style={{ fontStyle: 'italic', color: 'var(--ink-mute)', fontSize: 13, margin: 0 }}>
          This studio class has been cancelled.
        </p>
      ) : (
        <>
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
        </>
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

  if (past.length === 0) return null;

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
                  <span className="font-serif" style={{
                    fontSize: 16,
                    fontStyle: 'italic',
                    textDecoration: session.cancelled ? 'line-through' : 'none',
                    color: session.cancelled ? 'var(--ink-mute)' : 'var(--ink)',
                  }}>
                    {fmtDate(session.session_date)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
                    {session.cancelled ? 'cancelled' : `${pieces.length} piece${pieces.length !== 1 ? 's' : ''}`}
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
// Admin: edit default day/time
// -----------------------------------------------------------------------------

function AdminDefaults() {
  const { settings, update } = useSettings();
  const [day, setDay] = useState(settings.studio_default_day || 'Tuesday');
  const [time, setTime] = useState((settings.studio_default_time || '19:30').slice(0, 5));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    await update('studio_default_day', day);
    await update('studio_default_time', time);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const currentDay = settings.studio_default_day || 'Tuesday';
  const currentTime = (settings.studio_default_time || '19:30').slice(0, 5);
  const dirty = day !== currentDay || time !== currentTime;

  return (
    <section style={{ marginTop: 56, paddingTop: 32, borderTop: '0.5px solid var(--rule)' }}>
      <h2 className="font-serif" style={{
        fontSize: 18,
        fontStyle: 'italic',
        fontWeight: 400,
        margin: '0 0 6px',
      }}>
        Studio class defaults
      </h2>
      <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', margin: '0 0 16px' }}>
        When no session is explicitly scheduled, the student page automatically shows the next occurrence of this day/time.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={day} onChange={e => setDay(e.target.value)} style={miniInput}>
          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input type="time" value={time} onChange={e => setTime(e.target.value)} style={miniInput} />
        <Button onClick={save} size="sm" disabled={busy || !dirty}>
          {busy ? 'Saving…' : saved ? 'Saved' : 'Save defaults'}
        </Button>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Admin: create a new studio class session (one-off)
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
    <section style={{ marginTop: 40, paddingTop: 32, borderTop: '0.5px solid var(--rule)' }}>
      <h2 className="font-serif" style={{
        fontSize: 18,
        fontStyle: 'italic',
        fontWeight: 400,
        margin: '0 0 16px',
      }}>
        Create a one-off session
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

const dashedCard = {
  border: '0.5px dashed var(--rule)',
  padding: 28,
  marginBottom: 40,
  borderRadius: 2,
  background: 'var(--paper)',
  textAlign: 'center',
  color: 'var(--ink-mute)',
  fontSize: 14,
};
