import { useState } from 'react';
import { Check, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../../lib/auth.jsx';
import { useSlots } from '../../hooks/useSlots.js';
import { useProfiles } from '../../hooks/useProfiles.js';
import { useSettings } from '../../hooks/useSettings.js';
import { useSwapRequests } from '../../hooks/useSwapRequests.js';
import { supabase } from '../../lib/supabase.js';
import { fmtDate, fmtTime, groupSlotsByDate, todayISO, hoursUntilSlot } from '../../lib/dateUtils.js';
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
  const { incoming, outgoing, create: createSwap, accept, decline, cancel: cancelSwap } = useSwapRequests(myId);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [swapFor, setSwapFor] = useState(null); // slot object of other student we want to swap with
  const [swapMyId, setSwapMyId] = useState('');
  const [swapMsg, setSwapMsg] = useState('');
  const [swapBusy, setSwapBusy] = useState(false);
  const [swapErr, setSwapErr] = useState(null);

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

  const slotById = (id) => slots.find(s => s.id === id);
  const mySwappableSlots = slots.filter(s =>
    s.booked_by === myId && hoursUntilSlot(s.slot_date, s.slot_time) >= 24
  );

  const openSwap = (theirSlot) => {
    setSwapFor(theirSlot);
    setSwapMyId(mySwappableSlots[0]?.id || '');
    setSwapMsg('');
    setSwapErr(null);
  };

  const submitSwap = async () => {
    setSwapErr(null);
    if (!swapMyId) { setSwapErr('Pick one of your lessons to offer.'); return; }
    setSwapBusy(true);
    const { error } = await createSwap({
      requesterSlotId: swapMyId,
      targetId: swapFor.booked_by,
      targetSlotId: swapFor.id,
      message: swapMsg,
    });
    setSwapBusy(false);
    if (error) { setSwapErr(error.message); return; }
    setSwapFor(null);
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
        subtitle="Each slot is one hour. Click an open time to reserve it. Cancellations close 24 hours before the lesson."
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

      {(incoming.length > 0 || outgoing.length > 0) && (
        <section style={{ marginBottom: 32 }}>
          {incoming.length > 0 && (
            <div style={{ marginBottom: outgoing.length > 0 ? 18 : 0 }}>
              <div style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                marginBottom: 10,
              }}>
                Swap requests for you ({incoming.length})
              </div>
              {incoming.map(req => {
                const theirSlot = slotById(req.requester_slot_id);
                const mySlot = slotById(req.target_slot_id);
                return (
                  <div key={req.id} style={swapCard}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>
                        <strong>{displayName(req.requester_id)}</strong> wants to swap.
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                        You take <em className="font-serif">{theirSlot ? `${fmtDate(theirSlot.slot_date)} at ${fmtTime(theirSlot.slot_time)}` : 'their lesson'}</em>
                        {' '}· they take{' '}
                        <em className="font-serif">{mySlot ? `${fmtDate(mySlot.slot_date)} at ${fmtTime(mySlot.slot_time)}` : 'your lesson'}</em>
                      </div>
                      {req.message && (
                        <div className="font-serif" style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--ink-mute)', marginTop: 6 }}>
                          “{req.message}”
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="sm" onClick={async () => {
                        const { error: e } = await accept(req.id);
                        if (e) alert(e.message);
                      }}>Accept</Button>
                      <Button size="sm" variant="ghost" onClick={() => decline(req.id)}>Decline</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {outgoing.length > 0 && (
            <div>
              <div style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--ink-mute)',
                marginBottom: 10,
              }}>
                Pending swaps you've sent ({outgoing.length})
              </div>
              {outgoing.map(req => {
                const mySlot = slotById(req.requester_slot_id);
                const theirSlot = slotById(req.target_slot_id);
                return (
                  <div key={req.id} style={swapCard}>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--ink-soft)' }}>
                      Offering{' '}
                      <em className="font-serif">{mySlot ? `${fmtDate(mySlot.slot_date)} at ${fmtTime(mySlot.slot_time)}` : 'your lesson'}</em>
                      {' '}to <strong>{displayName(req.target_id)}</strong> for{' '}
                      <em className="font-serif">{theirSlot ? `${fmtDate(theirSlot.slot_date)} at ${fmtTime(theirSlot.slot_time)}` : 'their lesson'}</em>
                      <span style={{ marginLeft: 8, color: 'var(--ink-mute)' }}>· awaiting reply</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => cancelSwap(req.id)}>Withdraw</Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {swapFor && (
        <div onClick={() => setSwapFor(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(28,27,24,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--paper)', border: '0.5px solid var(--rule)', borderRadius: 2,
            padding: 28, maxWidth: 460, width: '100%', boxShadow: '0 18px 60px rgba(28,27,24,0.18)',
          }}>
            <div style={{
              fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
              color: 'var(--ink-mute)', marginBottom: 6,
            }}>
              Request a swap
            </div>
            <h3 className="font-serif" style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 400, margin: '0 0 14px' }}>
              with {displayName(swapFor.booked_by)}
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', margin: '0 0 14px' }}>
              They keep your lesson; you keep theirs ({fmtDate(swapFor.slot_date)} at {fmtTime(swapFor.slot_time)}).
              Please coordinate with them first — this only records the swap once they accept.
            </p>

            {mySwappableSlots.length === 0 ? (
              <p className="font-serif" style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ink-mute)' }}>
                You have no lessons at least 24 hours out to offer in a swap.
              </p>
            ) : (
              <>
                <label style={swapLabel}>Your lesson to offer</label>
                <select value={swapMyId} onChange={e => setSwapMyId(e.target.value)}
                  style={{ ...miniInput, width: '100%', marginBottom: 14 }}>
                  {mySwappableSlots.map(s => (
                    <option key={s.id} value={s.id}>
                      {fmtDate(s.slot_date)} · {fmtTime(s.slot_time)}
                    </option>
                  ))}
                </select>
                <label style={swapLabel}>Note (optional)</label>
                <textarea value={swapMsg} onChange={e => setSwapMsg(e.target.value)}
                  rows={3} placeholder="e.g. I have a recital that afternoon — thanks for swapping!"
                  style={{ ...miniInput, width: '100%', marginBottom: 14, fontFamily: 'inherit' }} />
              </>
            )}

            {swapErr && <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 10 }}>{swapErr}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setSwapFor(null)}>Cancel</Button>
              <Button size="sm" onClick={submitSwap} disabled={swapBusy || mySwappableSlots.length === 0}>
                {swapBusy ? 'Sending…' : 'Send request'}
              </Button>
            </div>
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
                const hoursOut = hoursUntilSlot(slot.slot_date, slot.slot_time);
                const locked = isMine && hoursOut < 24;

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
                      {isMine && !locked && (
                        <Button onClick={() => cancel(slot.id)} variant="danger" size="sm" disabled={thisBusy}>
                          {thisBusy ? '…' : 'Cancel'}
                        </Button>
                      )}
                      {isMine && locked && (
                        <span
                          title="Lessons cannot be cancelled within 24 hours of the start time. Contact Chi Ho directly if you have an emergency."
                          style={{ fontSize: 11, color: 'var(--ink-mute)', fontStyle: 'italic' }}
                          className="font-serif"
                        >
                          Within 24h · locked
                        </span>
                      )}
                      {isTaken && hoursOut >= 24 && mySwappableSlots.length > 0 && (() => {
                        const alreadySent = outgoing.some(r => r.target_slot_id === slot.id);
                        if (alreadySent) {
                          return <span style={{ fontSize: 11, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">Swap pending</span>;
                        }
                        return (
                          <button onClick={() => openSwap(slot)} style={swapInlineBtn} title="Request a swap">
                            <ArrowLeftRight size={11} strokeWidth={1.5} /> Swap
                          </button>
                        );
                      })()}
                      {isTaken && !(hoursOut >= 24 && mySwappableSlots.length > 0) && (
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

const swapCard = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '14px 16px',
  border: '0.5px solid var(--rule)',
  borderLeft: '2px solid var(--accent)',
  background: 'var(--paper-soft)',
  borderRadius: 2,
  marginBottom: 10,
};

const swapInlineBtn = {
  fontSize: 11,
  color: 'var(--ink-mute)',
  padding: '5px 10px',
  border: '0.5px solid var(--rule)',
  borderRadius: 2,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};

const swapLabel = {
  display: 'block',
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--ink-mute)',
  marginBottom: 6,
};

const miniInput = {
  padding: '8px 10px',
  fontSize: 13,
  border: '1px solid var(--rule)',
  borderRadius: 2,
  background: 'transparent',
  color: 'var(--ink)',
};
