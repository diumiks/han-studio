import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Archive, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { fmtDate, fmtTime, todayISO } from '../../lib/dateUtils.js';
import { useProfiles } from '../../hooks/useProfiles.js';
import PageHeader from '../../components/PageHeader.jsx';
import Button from '../../components/Button.jsx';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { byId, refetch: refetchProfiles } = useProfiles();
  const profile = byId(id);

  const [lessons, setLessons] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: slots }, { data: sp }] = await Promise.all([
        supabase.from('slots')
          .select('*')
          .eq('booked_by', id)
          .order('slot_date', { ascending: false })
          .order('slot_time', { ascending: true }),
        supabase.from('studio_pieces')
          .select('id, piece, session_id, studio_class(session_date, session_time, cancelled)')
          .eq('student_id', id)
          .order('id', { ascending: false }),
      ]);
      setLessons(slots || []);
      setPieces(sp || []);
      setLoading(false);
    })();
  }, [id]);

  const toggleArchive = async () => {
    if (!profile) return;
    const next = !profile.archived;
    const msg = next
      ? `Archive ${profile.full_name || profile.email}?`
      : `Restore ${profile.full_name || profile.email} to the active roster?`;
    if (!confirm(msg)) return;
    setBusy(true);
    await supabase.from('profiles').update({ archived: next }).eq('id', id);
    await refetchProfiles();
    setBusy(false);
  };

  if (!profile && !loading) {
    return (
      <>
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => navigate('/students')} style={backLink}>
            <ArrowLeft size={13} strokeWidth={1.5} /> Back to roster
          </button>
        </div>
        <p className="font-serif" style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--ink-mute)' }}>
          Student not found.
        </p>
      </>
    );
  }

  const today = todayISO();
  const upcoming = lessons.filter(l => l.slot_date >= today);
  const past = lessons.filter(l => l.slot_date < today);

  // Separate upcoming / past studio pieces
  const upcomingPieces = pieces.filter(p => p.studio_class && p.studio_class.session_date >= today);
  const pastPieces = pieces.filter(p => p.studio_class && p.studio_class.session_date < today);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => navigate('/students')} style={backLink}>
          <ArrowLeft size={13} strokeWidth={1.5} /> Back to roster
        </button>
      </div>

      <PageHeader
        eyebrow={profile?.archived ? 'Archived student' : 'Student'}
        title={profile?.full_name || profile?.email?.split('@')[0] || '—'}
        subtitle={profile?.email}
      />

      {profile && (
        <div style={{ marginBottom: 32 }}>
          <Button onClick={toggleArchive} variant="secondary" size="sm" disabled={busy}>
            {profile.archived ? (
              <><RotateCcw size={12} strokeWidth={1.5} /> Restore to active</>
            ) : (
              <><Archive size={12} strokeWidth={1.5} /> Archive</>
            )}
          </Button>
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">Loading…</p>
      ) : (
        <>
          <LessonsSection title="Upcoming lessons" rows={upcoming} empty="No upcoming lessons." />
          <LessonsSection title="Past lessons" rows={past} empty="No past lessons on record." muted />

          <PiecesSection title="Upcoming studio-class pieces" rows={upcomingPieces} empty="No upcoming sign-ups." />
          <PiecesSection title="Past studio-class pieces" rows={pastPieces} empty="No past pieces on record." muted />
        </>
      )}
    </>
  );
}

function LessonsSection({ title, rows, empty, muted }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 className="font-serif" style={{
        fontSize: 18,
        fontStyle: 'italic',
        fontWeight: 400,
        margin: '0 0 14px',
      }}>
        {title} {rows.length > 0 && <span style={{ fontSize: 12, fontStyle: 'normal', color: 'var(--ink-mute)', marginLeft: 8 }}>({rows.length})</span>}
      </h2>
      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">{empty}</p>
      ) : (
        <div style={{ border: '0.5px solid var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
          {rows.map((l, i) => (
            <div key={l.id} style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr 1fr',
              padding: '12px 16px',
              fontSize: 13,
              borderTop: i > 0 ? '0.5px solid var(--rule-soft)' : 'none',
              color: muted ? 'var(--ink-mute)' : 'var(--ink)',
              alignItems: 'center',
            }}>
              <span className="font-serif" style={{ fontSize: 14, fontStyle: 'italic' }}>
                {fmtDate(l.slot_date)}
              </span>
              <span className="font-mono" style={{ fontSize: 12.5 }}>
                {fmtTime(l.slot_time)}{l.duration_min ? ` · ${l.duration_min} min` : ''}
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink-mute)', textAlign: 'right' }}>
                {l.note || ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PiecesSection({ title, rows, empty, muted }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 className="font-serif" style={{
        fontSize: 18,
        fontStyle: 'italic',
        fontWeight: 400,
        margin: '0 0 14px',
      }}>
        {title} {rows.length > 0 && <span style={{ fontSize: 12, fontStyle: 'normal', color: 'var(--ink-mute)', marginLeft: 8 }}>({rows.length})</span>}
      </h2>
      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">{empty}</p>
      ) : (
        <div style={{ border: '0.5px solid var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
          {rows.map((p, i) => {
            const sc = p.studio_class;
            return (
              <div key={p.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                padding: '12px 16px',
                fontSize: 13,
                borderTop: i > 0 ? '0.5px solid var(--rule-soft)' : 'none',
                color: muted ? 'var(--ink-mute)' : 'var(--ink)',
                alignItems: 'center',
                gap: 16,
              }}>
                <span style={{ fontSize: 12.5 }}>
                  {sc ? fmtDate(sc.session_date) : '—'}
                  {sc?.cancelled && <span style={{ marginLeft: 6, color: 'var(--accent)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em' }}>cancelled</span>}
                </span>
                <span className="font-serif" style={{ fontSize: 14, fontStyle: 'italic', color: muted ? 'var(--ink-mute)' : 'var(--ink-soft)' }}>
                  {p.piece}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const backLink = {
  fontSize: 12,
  color: 'var(--ink-mute)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 0',
};
