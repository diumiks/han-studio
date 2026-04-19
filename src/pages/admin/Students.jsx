import { useEffect, useState } from 'react';
import { Archive, RotateCcw } from 'lucide-react';
import { useProfiles } from '../../hooks/useProfiles.js';
import { supabase } from '../../lib/supabase.js';
import { todayISO } from '../../lib/dateUtils.js';
import PageHeader from '../../components/PageHeader.jsx';
import Button from '../../components/Button.jsx';

export default function Students() {
  const { students, archivedStudents, loading: profilesLoading, refetch } = useProfiles();
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (profilesLoading) return;
    (async () => {
      const today = todayISO();
      const { data: all } = await supabase
        .from('slots')
        .select('booked_by, slot_date')
        .not('booked_by', 'is', null);

      const map = {};
      (all || []).forEach(s => {
        if (!map[s.booked_by]) map[s.booked_by] = { upcoming: 0, past: 0 };
        if (s.slot_date >= today) map[s.booked_by].upcoming++;
        else map[s.booked_by].past++;
      });
      setCounts(map);
      setLoading(false);
    })();
  }, [profilesLoading]);

  const setArchived = async (id, archived) => {
    setBusyId(id);
    await supabase.from('profiles').update({ archived }).eq('id', id);
    await refetch();
    setBusyId(null);
  };

  const roster = showArchived ? archivedStudents : students;
  const rows = roster.map(s => {
    const c = counts[s.id] || { upcoming: 0, past: 0 };
    return { ...s, upcoming: c.upcoming, past: c.past, total: c.upcoming + c.past };
  }).sort((a, b) => b.total - a.total);

  return (
    <>
      <PageHeader
        eyebrow="Studio roster"
        title="Students"
        subtitle={`${students.length} active · ${archivedStudents.length} archived.`}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <Button
          onClick={() => setShowArchived(false)}
          variant={showArchived ? 'ghost' : 'secondary'}
          size="sm"
        >
          Active ({students.length})
        </Button>
        <Button
          onClick={() => setShowArchived(true)}
          variant={showArchived ? 'secondary' : 'ghost'}
          size="sm"
        >
          Archived ({archivedStudents.length})
        </Button>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">
          {showArchived
            ? 'No archived students yet.'
            : 'No students have signed up yet. Share the login link with your studio.'}
        </p>
      ) : (
        <div style={{ border: '0.5px solid var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1.3fr 70px 70px 70px 110px',
            padding: '12px 18px',
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-mute)',
            borderBottom: '0.5px solid var(--rule)',
            background: 'var(--paper-soft)',
          }}>
            <span>Name</span>
            <span>Email</span>
            <span style={{ textAlign: 'right' }}>Upcoming</span>
            <span style={{ textAlign: 'right' }}>Past</span>
            <span style={{ textAlign: 'right' }}>Total</span>
            <span style={{ textAlign: 'right' }}></span>
          </div>
          {rows.map((r, i) => (
            <div key={r.id} style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1.3fr 70px 70px 70px 110px',
              padding: '13px 18px',
              fontSize: 13,
              borderTop: i > 0 ? '0.5px solid var(--rule-soft)' : 'none',
              alignItems: 'center',
            }}>
              <span style={{ fontWeight: 500 }}>
                {r.full_name || <em style={{ color: 'var(--ink-mute)' }}>unnamed</em>}
              </span>
              <span style={{ color: 'var(--ink-mute)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.email}
              </span>
              <span className="font-mono" style={{ textAlign: 'right', color: r.upcoming ? 'var(--ink)' : 'var(--ink-faint)' }}>
                {r.upcoming}
              </span>
              <span className="font-mono" style={{ textAlign: 'right', color: 'var(--ink-mute)' }}>{r.past}</span>
              <span className="font-mono" style={{ textAlign: 'right', fontWeight: 500 }}>{r.total}</span>
              <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {showArchived ? (
                  <button
                    onClick={() => setArchived(r.id, false)}
                    disabled={busyId === r.id}
                    title="Restore student"
                    style={archiveBtn}
                  >
                    <RotateCcw size={11} strokeWidth={1.5} /> Restore
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (confirm(`Archive ${r.full_name || r.email}? They will no longer appear in the active roster or in student pickers, but their lesson history is preserved.`)) {
                        setArchived(r.id, true);
                      }
                    }}
                    disabled={busyId === r.id}
                    title="Archive (mark graduated)"
                    style={archiveBtn}
                  >
                    <Archive size={11} strokeWidth={1.5} /> Archive
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {!showArchived && (
        <p style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 16, fontStyle: 'italic' }} className="font-serif">
          Archiving a student keeps their lesson history intact but removes them from active rosters and restriction pickers.
        </p>
      )}
    </>
  );
}

const archiveBtn = {
  fontSize: 11,
  color: 'var(--ink-mute)',
  padding: '4px 8px',
  border: '0.5px solid var(--rule)',
  borderRadius: 2,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};
