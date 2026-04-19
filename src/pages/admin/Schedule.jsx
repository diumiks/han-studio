import { useState } from 'react';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import { useSlots } from '../../hooks/useSlots.js';
import { useProfiles } from '../../hooks/useProfiles.js';
import { useSettings } from '../../hooks/useSettings.js';
import { supabase } from '../../lib/supabase.js';
import { fmtDate, fmtTime, groupSlotsByDate, todayISO } from '../../lib/dateUtils.js';
import PageHeader from '../../components/PageHeader.jsx';
import Button from '../../components/Button.jsx';
import Pill from '../../components/Pill.jsx';

const rangeEnd = () => {
  const d = new Date();
  d.setDate(d.getDate() + 56);
  return d.toISOString().slice(0, 10);
};

export default function Schedule() {
  const { slots, loading } = useSlots(todayISO(), rangeEnd());
  const { displayName, students } = useProfiles();
  const { settings, update } = useSettings();

  const [editAnn, setEditAnn] = useState(false);
  const [annDraft, setAnnDraft] = useState('');
  const [annBusy, setAnnBusy] = useState(false);

  const groups = groupSlotsByDate(slots);
  const dates = Object.keys(groups).sort();
  const totalBooked = slots.filter(s => s.booked_by).length;
  const totalOpen = slots.length - totalBooked;

  const openEditAnn = () => {
    setAnnDraft(settings.announcement || '');
    setEditAnn(true);
  };
  const saveAnn = async () => {
    setAnnBusy(true);
    await update('announcement', annDraft);
    setAnnBusy(false);
    setEditAnn(false);
  };

  const deleteSlot = async (slotId) => {
    if (!confirm('Delete this slot? This cannot be undone.')) return;
    await supabase.from('slots').delete().eq('id', slotId);
  };

  const deleteDay = async (date) => {
    const daySlots = groups[date];
    const hasBookings = daySlots.some(s => s.booked_by);
    const msg = hasBookings
      ? `This day has ${daySlots.filter(s => s.booked_by).length} booked lesson(s). Delete all slots anyway?`
      : `Delete all ${daySlots.length} slots on this day?`;
    if (!confirm(msg)) return;
    await supabase.from('slots').delete().eq('slot_date', date);
  };

  return (
    <>
      <PageHeader
        eyebrow="Studio schedule"
        title="Upcoming lessons"
        subtitle="Every slot you've opened, who's taken them, and what's still available. Click the pencil to edit a slot."
      />

      {/* Stats */}
      <div className="responsive-stats" style={{
        display: 'flex',
        gap: 40,
        paddingBottom: 28,
        marginBottom: 32,
        borderBottom: '0.5px solid var(--rule)',
        flexWrap: 'wrap',
      }}>
        <Stat label="Booked" value={totalBooked} />
        <Stat label="Open" value={totalOpen} muted />
        <Stat label="Days open" value={dates.length} />
      </div>

      {/* Announcement editor */}
      <div style={{
        marginBottom: 36,
        padding: 20,
        background: 'var(--paper-soft)',
        border: '0.5px solid var(--rule)',
        borderRadius: 2,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
          }}>
            Note to students
          </div>
          {!editAnn && (
            <Button onClick={openEditAnn} variant="ghost" size="sm">Edit</Button>
          )}
        </div>
        {!editAnn ? (
          <div style={{ fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {settings.announcement
              ? settings.announcement
              : <span className="font-serif" style={{ fontStyle: 'italic', color: 'var(--ink-mute)' }}>
                  No note this week. Click Edit to add one.
                </span>
            }
          </div>
        ) : (
          <>
            <textarea
              value={annDraft}
              onChange={e => setAnnDraft(e.target.value)}
              rows={3}
              placeholder="e.g. No studio class this week. I'll be at a competition April 22-25."
              style={{
                width: '100%',
                padding: 10,
                fontSize: 13.5,
                border: '1px solid var(--rule)',
                borderRadius: 2,
                background: 'var(--paper)',
                resize: 'vertical',
                lineHeight: 1.5,
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Button onClick={saveAnn} size="sm" disabled={annBusy}>
                {annBusy ? 'Saving…' : 'Save note'}
              </Button>
              <Button onClick={() => setEditAnn(false)} variant="ghost" size="sm">Cancel</Button>
            </div>
          </>
        )}
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">Loading…</p>
      ) : dates.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">
          No upcoming slots. Head to Open slots to create this week's availability.
        </p>
      ) : dates.map(date => {
        const daySlots = groups[date];
        const dayBooked = daySlots.filter(s => s.booked_by).length;
        const restriction = daySlots[0].restricted_to;
        const isRestricted = restriction && restriction.length > 0;

        return (
          <section key={date} style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
              <h2 className="font-serif" style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 400, margin: 0 }}>
                {fmtDate(date)}
              </h2>
              <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
                {dayBooked} of {daySlots.length} booked
                {isRestricted && ` · restricted to ${restriction.length} students`}
              </span>
              <button
                onClick={() => deleteDay(date)}
                style={{
                  fontSize: 11,
                  color: 'var(--ink-mute)',
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Trash2 size={11} strokeWidth={1.5} /> Delete day
              </button>
            </div>
            <div style={{ border: '0.5px solid var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
              {daySlots.map((slot, i) => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  index={i}
                  students={students}
                  displayName={displayName}
                  onDelete={() => deleteSlot(slot.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

// -----------------------------------------------------------------------------
// SlotRow — display + inline editor (time + assignment)
// -----------------------------------------------------------------------------

function SlotRow({ slot, index, students, displayName, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [tempTime, setTempTime] = useState('');
  const [tempBookedBy, setTempBookedBy] = useState(''); // '' = open
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const startEdit = () => {
    setTempTime((slot.slot_time || '').slice(0, 5));
    setTempBookedBy(slot.booked_by || '');
    setErr(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setErr(null);
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    const patch = {
      slot_time: tempTime,
      booked_by: tempBookedBy || null,
    };
    const { error } = await supabase.from('slots').update(patch).eq('id', slot.id);
    setBusy(false);
    if (error) {
      setErr(error.message.includes('duplicate') || error.message.includes('unique')
        ? 'Another slot at this time already exists on this day.'
        : error.message);
    } else {
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div style={{
        padding: '14px 18px',
        borderTop: index > 0 ? '0.5px solid var(--rule-soft)' : 'none',
        background: 'var(--paper-soft)',
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="time"
            value={tempTime}
            onChange={e => setTempTime(e.target.value)}
            style={miniInput}
          />
          <select
            value={tempBookedBy}
            onChange={e => setTempBookedBy(e.target.value)}
            style={{ ...miniInput, minWidth: 180 }}
          >
            <option value="">— Open (no student) —</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {s.full_name || s.email}
              </option>
            ))}
          </select>
          <Button onClick={save} size="sm" disabled={busy || !tempTime}>
            <Check size={12} strokeWidth={1.5} /> {busy ? 'Saving…' : 'Save'}
          </Button>
          <Button onClick={cancelEdit} variant="ghost" size="sm">
            <X size={12} strokeWidth={1.5} /> Cancel
          </Button>
        </div>
        {err && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>{err}</div>}
      </div>
    );
  }

  return (
    <div style={{
      padding: '12px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      borderTop: index > 0 ? '0.5px solid var(--rule-soft)' : 'none',
      background: slot.booked_by ? 'var(--paper)' : 'var(--paper-soft)',
      flexWrap: 'wrap',
    }}>
      <div className="font-mono" style={{ fontSize: 13, width: 52, flexShrink: 0 }}>
        {fmtTime(slot.slot_time)}
      </div>
      <div style={{ flex: 1, fontSize: 13, minWidth: 0 }}>
        {slot.booked_by ? (
          <span>{displayName(slot.booked_by)}</span>
        ) : (
          <span className="font-serif" style={{ fontStyle: 'italic', color: 'var(--ink-mute)' }}>Open</span>
        )}
      </div>
      {slot.booked_by && <Pill color="green">Booked</Pill>}
      <button
        onClick={startEdit}
        title="Edit this slot"
        style={iconBtn}
      >
        <Pencil size={12} strokeWidth={1.5} />
      </button>
      <button
        onClick={onDelete}
        title="Delete this slot"
        style={iconBtn}
      >
        <Trash2 size={12} strokeWidth={1.5} />
      </button>
    </div>
  );
}

function Stat({ label, value, muted }) {
  return (
    <div>
      <div style={{
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--ink-mute)',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div className="font-serif" style={{
        fontSize: 36,
        lineHeight: 1,
        color: muted ? 'var(--ink-mute)' : 'var(--ink)',
      }}>
        {value}
      </div>
    </div>
  );
}

const miniInput = {
  padding: '8px 10px',
  fontSize: 13,
  border: '1px solid var(--rule)',
  borderRadius: 2,
  background: 'var(--paper)',
  color: 'var(--ink)',
};

const iconBtn = {
  color: 'var(--ink-mute)',
  padding: 4,
  borderRadius: 2,
};
