import { useState, useEffect } from 'react';
import { useProfiles } from '../../hooks/useProfiles.js';
import { supabase } from '../../lib/supabase.js';
import { fmtDate } from '../../lib/dateUtils.js';
import PageHeader from '../../components/PageHeader.jsx';
import Button from '../../components/Button.jsx';

export default function OpenSlots() {
  const { students } = useProfiles();

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('18:00');
  const [restrictEnabled, setRestrictEnabled] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [preview, setPreview] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!date || !startTime || !endTime) { setPreview([]); return; }
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (endMin <= startMin) { setPreview([]); return; }
    const times = [];
    for (let m = startMin; m + 60 <= endMin; m += 60) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      times.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
    setPreview(times);
  }, [date, startTime, endTime]);

  const toggleStudent = (id) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const confirm = async () => {
    if (!preview.length || !date) return;
    setBusy(true); setMsg(null);
    const restrictedTo = restrictEnabled && selectedStudents.length ? selectedStudents : null;
    const rows = preview.map(time => ({
      slot_date: date,
      slot_time: time,
      restricted_to: restrictedTo,
    }));
    const { error } = await supabase.from('slots').insert(rows);
    setBusy(false);
    if (error) {
      setMsg({ type: 'error', text: error.message.includes('duplicate')
        ? 'Some of these times already exist for this date. Delete them first, or pick different times.'
        : error.message });
    } else {
      setMsg({ type: 'success', text: `Published ${preview.length} slot${preview.length > 1 ? 's' : ''} on ${fmtDate(date)}.` });
      setDate('');
      setSelectedStudents([]);
      setRestrictEnabled(false);
      setPreview([]);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Open new availability"
        title="Add lesson slots"
        subtitle="Enter a date and time range. It will be split into one-hour slots automatically."
      />

      {msg && (
        <div style={{
          fontSize: 13,
          color: msg.type === 'error' ? 'var(--accent)' : 'var(--green)',
          background: msg.type === 'error' ? '#F5E1DC' : 'var(--green-soft)',
          padding: '10px 14px',
          borderRadius: 2,
          marginBottom: 20,
          border: msg.type === 'error' ? '0.5px solid #E0BAB0' : '0.5px solid #B5C5BC',
        }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
        {/* Form column */}
        <div>
          <Field label="Date">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={input} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <Field label="Start">
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={input} />
            </Field>
            <Field label="End">
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={input} />
            </Field>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={restrictEnabled} onChange={e => setRestrictEnabled(e.target.checked)} />
              Restrict to specific students
            </label>

            {restrictEnabled && (
              <div className="scrollbar" style={{
                marginTop: 12,
                maxHeight: 220,
                overflowY: 'auto',
                border: '0.5px solid var(--rule)',
                borderRadius: 2,
                padding: 4,
              }}>
                {students.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--ink-mute)', padding: 12, margin: 0 }}>
                    No students in the system yet.
                  </p>
                ) : students.map(s => (
                  <label key={s.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 10px',
                    fontSize: 13,
                    cursor: 'pointer',
                    borderRadius: 2,
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                    />
                    {s.full_name || s.email}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview column */}
        <div>
          <div style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
            marginBottom: 14,
          }}>
            Will create
          </div>
          {preview.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">
              Enter a valid date and time range.
            </p>
          ) : (
            <>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
                <span className="font-serif" style={{ fontSize: 16, fontStyle: 'italic' }}>
                  {fmtDate(date)}
                </span>
                <div style={{ marginTop: 2 }}>
                  {preview.length} × one-hour slot{preview.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ border: '0.5px solid var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                {preview.map((t, i) => (
                  <div key={t} style={{
                    padding: '9px 14px',
                    fontSize: 13,
                    borderTop: i > 0 ? '0.5px solid var(--rule-soft)' : 'none',
                    display: 'flex',
                    gap: 16,
                  }}>
                    <span className="font-mono" style={{ color: 'var(--ink-mute)' }}>{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-mono">{t}</span>
                  </div>
                ))}
              </div>
              {restrictEnabled && selectedStudents.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-mute)' }}>
                  Visible to: {selectedStudents.map(id => {
                    const s = students.find(x => x.id === id);
                    return s?.full_name || s?.email?.split('@')[0];
                  }).join(', ')}
                </div>
              )}
              <div style={{ marginTop: 20 }}>
                <Button onClick={confirm} size="lg" disabled={busy}>
                  {busy ? 'Publishing…' : 'Publish slots'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const input = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  border: '1px solid var(--rule)',
  borderRadius: 2,
  background: 'transparent',
  color: 'var(--ink)',
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--ink-soft)',
        display: 'block',
        marginBottom: 8,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}
