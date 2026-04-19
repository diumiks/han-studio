import { useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../../lib/auth.jsx';
import { useSlots } from '../../hooks/useSlots.js';
import { useProfiles } from '../../hooks/useProfiles.js';
import { useSettings } from '../../hooks/useSettings.js';
import { supabase } from '../../lib/supabase.js';
import { fmtDate, fmtTime, groupSlotsByDate, todayISO } from '../../lib/dateUtils.js';
import PageHeader from '../../components/PageHeader.jsx';
import Button from '../../components/Button.jsx';
import Pill from '../../components/Pill.jsx';

// Show slots from today through 8 weeks out
const rangeEnd = () => {
  const d = new Date();
  d.setDate(d.getDate() + 56);
  return d.toISOString().slice(0, 10);
};

export default function Book() {
  const { profile } = useAuth();
  const myId = profile.id;
  const { slots, loading } = useSlots(todayISO(), rangeEnd());
  const { displayName } = useProfiles();
  const { settings } = useSettings();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  // Slots visible to this student (either unrestricted or whitelisted)
  const visibleSlots = slots.filter(s =>
    !s.restricted_to || s.restricted_to.length === 0 || s.restricted_to.includes(myId)
  );

  const groups = groupSlotsByDate(visibleSlots);
  const dates = Object.keys(groups).sort();

  const myCountThisView = visibleSlots.filter(s => s.booked_by === myId).length;
  const lessonsPerSemester = parseInt(settings.lessons_per_semester || '14', 10);

  const book = async (slotId) => {
    setBusy(slotId); setError(null);
    const { error } = await supabase
      .from('slots')
      .update({ booked_by: myId })
      .eq('id', slotId)
      .is('booked_by', null);
    setBusy(null);
    if (error) setError('Could not book that slot — someone may have just taken it. Please refresh.');
  };

  const cancel = async (slotId) => {
    setBusy(slotId); setError(null);
    const { error } = await supabase
      .from('slots')
      .update({ booked_by: null })
      .eq('id', slotId)
      .eq('booked_by', myId);
    setBusy(null);
    if (error) setError(error.message);
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Available slots" />
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">
          Loading…
        </p>
      </>
    );
  }

  const announcement = settings.announcement;

  return (
    <>
      <PageHeader
        eyebrow="Book a lesson"
        title="Available slots"
        subtitle="Each slot is one hour. Click an open time to reserve it; you can cancel any time before the lesson."
      />

      {announcement && (
        <div style={{
          padding: '16px 20px',
          background: 'var(--paper-soft)',
          border: '0.5px solid var(--rule)',
          borderLeft: '2px solid var(--accent)',
          marginBottom: 32,
          borderRadius: 2,
        }}>
          <div style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 6,
            fontWeight: 500,
          }}>
            From Chi Ho
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
            {announcement}
          </div>
        </div>
      )}

      {myCountThisView > 0 && (
        <div style={{
          fontSize: 12,
          color: 'var(--green)',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <Check size={13} strokeWidth={2} />
          You have {myCountThisView} upcoming lesson{myCountThisView > 1 ? 's' : ''} booked.
          <span style={{ color: 'var(--ink-mute)', marginLeft: 6 }}>
            · reminder: {lessonsPerSemester} lessons per semester
          </span>
        </div>
      )}

      {error && (
        <div style={{
          fontSize: 13,
          color: 'var(--accent)',
          background: '#F5E1DC',
          padding: '10px 14px',
          borderRadius: 2,
          marginBottom: 20,
          border: '0.5px solid #E0BAB0',
        }}>
          {error}
        </div>
      )}

      {dates.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">
          No slots open right now. Check back soon — Chi Ho usually posts the week's availability a few days in advance.
        </p>
      ) : dates.map(date => {
        const daySlots = groups[date];
        const restriction = daySlots[0].restricted_to;
        const isRestricted = restriction && restriction.length > 0;

        return (
          <section key={date} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
              <h2 className="font-serif" style={{
                fontSize: 22,
                fontWeight: 400,
                margin: 0,
                fontStyle: 'italic',
              }}>
                {fmtDate(date)}
              </h2>
              {isRestricted && (
                <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
                  · limited to {restriction.length} students
                </span>
              )}
            </div>

            <div style={{ border: '0.5px solid var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
              {daySlots.map((slot, i) => {
                const isMine = slot.booked_by === myId;
                const isTaken = slot.booked_by && !isMine;
                const isFree = !slot.booked_by;
                const thisBusy = busy === slot.id;
                const bookerName = isTaken ? displayName(slot.booked_by) : '';

                return (
                  <div key={slot.id} style={{
                    background: isMine ? 'var(--green-soft)' : 'var(--paper)',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    borderTop: i > 0 ? '0.5px solid var(--rule-soft)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1, minWidth: 0 }}>
                      <div className="font-mono" style={{
                        fontSize: 14,
                        fontWeight: 500,
                        width: 52,
                        color: isTaken ? 'var(--ink-mute)' : 'var(--ink)',
                        flexShrink: 0,
                      }}>
                        {fmtTime(slot.slot_time)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {isMine && <Pill color="green">Your lesson</Pill>}
                        {isTaken && (
                          <span style={{ fontSize: 13, color: 'var(--ink-mute)' }}>
                            Booked by {bookerName}
                          </span>
                        )}
                        {isFree && (
                          <span className="font-serif" style={{ fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                            Available
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {isFree && (
                        <Button onClick={() => book(slot.id)} size="sm" disabled={thisBusy}>
                          {thisBusy ? '…' : 'Reserve'}
                        </Button>
                      )}
                      {isMine && (
                        <Button onClick={() => cancel(slot.id)} variant="danger" size="sm" disabled={thisBusy}>
                          {thisBusy ? '…' : 'Cancel'}
                        </Button>
                      )}
                      {isTaken && (
                        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
