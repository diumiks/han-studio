import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, RotateCcw, Plus, Trash2, ChevronRight } from 'lucide-react';
import { useProfiles } from '../../hooks/useProfiles.js';
import { useAllowedEmails } from '../../hooks/useAllowedEmails.js';
import { supabase } from '../../lib/supabase.js';
import { hoursUntilSlot } from '../../lib/dateUtils.js';
import PageHeader from '../../components/PageHeader.jsx';
import Button from '../../components/Button.jsx';

export default function Students() {
  const navigate = useNavigate();
  const { students, archivedStudents, profiles, loading: profilesLoading, refetch } = useProfiles();
  const { rows: invited, add: addInvite, remove: removeInvite } = useAllowedEmails();
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteErr, setInviteErr] = useState(null);
  const [inviteBusy, setInviteBusy] = useState(false);

  useEffect(() => {
    if (profilesLoading) return;
    (async () => {
      const { data: all } = await supabase
        .from('slots')
        .select('booked_by, slot_date, slot_time')
        .not('booked_by', 'is', null);

      const map = {};
      (all || []).forEach(s => {
        if (!map[s.booked_by]) map[s.booked_by] = { upcoming: 0, past: 0 };
        if (hoursUntilSlot(s.slot_date, s.slot_time) >= 0) map[s.booked_by].upcoming++;
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

  const submitInvite = async () => {
    setInviteErr(null);
    if (!inviteEmail.trim()) { setInviteErr('Email required.'); return; }
    setInviteBusy(true);
    const { error } = await addInvite(inviteEmail, inviteName);
    setInviteBusy(false);
    if (error) { setInviteErr(error.message); return; }
    setInviteEmail('');
    setInviteName('');
  };

  // Emails already claimed (i.e. a profile exists for that email, active or archived)
  const claimedEmails = new Set(profiles.map(p => p.email?.toLowerCase()));
  const pendingInvites = invited.filter(r => !claimedEmails.has(r.email.toLowerCase()));

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
            : 'No students have signed up yet. Invite them below.'}
        </p>
      ) : (
        <div style={{ border: '0.5px solid var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
          <div className="responsive-students-grid" style={{
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
            <div
              key={r.id}
              onClick={() => navigate(`/students/${r.id}`)}
              className="responsive-students-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1.3fr 70px 70px 70px 110px',
                padding: '13px 18px',
                fontSize: 13,
                borderTop: i > 0 ? '0.5px solid var(--rule-soft)' : 'none',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-soft)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                {r.full_name || <em style={{ color: 'var(--ink-mute)' }}>unnamed</em>}
                <ChevronRight size={12} strokeWidth={1.5} style={{ color: 'var(--ink-faint)' }} />
              </span>
              <span style={{ color: 'var(--ink-mute)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.email}
              </span>
              <span className="font-mono" style={{ textAlign: 'right', color: r.upcoming ? 'var(--ink)' : 'var(--ink-faint)' }}>
                {r.upcoming}
              </span>
              <span className="font-mono" style={{ textAlign: 'right', color: 'var(--ink-mute)' }}>{r.past}</span>
              <span className="font-mono" style={{ textAlign: 'right', fontWeight: 500 }}>{r.total}</span>
              <span style={{ display: 'flex', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
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
          Click a row to see a student's full lesson history and studio-class pieces.
          Archiving keeps their history intact but removes them from active rosters.
        </p>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Invite roster                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section style={{ marginTop: 56, paddingTop: 32, borderTop: '0.5px solid var(--rule)' }}>
        <h2 className="font-serif" style={{
          fontSize: 18,
          fontStyle: 'italic',
          fontWeight: 400,
          margin: '0 0 6px',
        }}>
          Invite a student
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', margin: '0 0 16px' }}>
          Only emails on this list can create an account. Add a student here before sharing the login link.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="student@indiana.edu"
            style={{ ...miniInput, minWidth: 240, flex: 1 }}
          />
          <input
            type="text"
            value={inviteName}
            onChange={e => setInviteName(e.target.value)}
            placeholder="Full name (optional)"
            style={{ ...miniInput, minWidth: 200, flex: 1 }}
          />
          <Button onClick={submitInvite} size="sm" disabled={inviteBusy}>
            <Plus size={13} strokeWidth={1.5} /> {inviteBusy ? 'Adding…' : 'Add'}
          </Button>
        </div>
        {inviteErr && <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 10 }}>{inviteErr}</div>}

        {pendingInvites.length > 0 && (
          <div>
            <div style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-mute)',
              marginBottom: 10,
            }}>
              Pending sign-up ({pendingInvites.length})
            </div>
            <div style={{ border: '0.5px solid var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
              {pendingInvites.map((r, i) => (
                <div key={r.email} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 14px',
                  gap: 12,
                  borderTop: i > 0 ? '0.5px solid var(--rule-soft)' : 'none',
                  fontSize: 13,
                }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.full_name && (
                      <span style={{ fontWeight: 500, marginRight: 8 }}>{r.full_name}</span>
                    )}
                    <span style={{ color: 'var(--ink-mute)' }}>{r.email}</span>
                  </span>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${r.email} from the invite list?`)) removeInvite(r.email);
                    }}
                    title="Remove invite"
                    style={archiveBtn}
                  >
                    <Trash2 size={11} strokeWidth={1.5} /> Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
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

const miniInput = {
  padding: '8px 10px',
  fontSize: 13,
  border: '1px solid var(--rule)',
  borderRadius: 2,
  background: 'transparent',
  color: 'var(--ink)',
};
