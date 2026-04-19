import { useAuth } from '../../lib/auth.jsx';
import { useMySlots } from '../../hooks/useSlots.js';
import { useSettings } from '../../hooks/useSettings.js';
import { fmtDate, fmtTime, todayISO } from '../../lib/dateUtils.js';
import PageHeader from '../../components/PageHeader.jsx';
import Pill from '../../components/Pill.jsx';

export default function MyLessons() {
  const { profile } = useAuth();
  const { slots, loading } = useMySlots(profile.id);
  const { settings } = useSettings();
  const lessonsPerSemester = parseInt(settings.lessons_per_semester || '14', 10);

  const today = todayISO();
  const upcoming = slots
    .filter(s => s.slot_date >= today)
    .sort((a, b) => (a.slot_date + a.slot_time).localeCompare(b.slot_date + b.slot_time));
  const past = slots
    .filter(s => s.slot_date < today)
    .sort((a, b) => (b.slot_date + b.slot_time).localeCompare(a.slot_date + a.slot_time));

  const total = slots.length;

  return (
    <>
      <PageHeader
        eyebrow="Your record"
        title="My lessons"
        subtitle={`A running log of your lessons with Prof. Han. The studio runs ${lessonsPerSemester} lessons per semester.`}
      />

      {/* Stats */}
      <div style={{
        display: 'flex',
        gap: 48,
        paddingBottom: 32,
        marginBottom: 32,
        borderBottom: '0.5px solid var(--rule)',
        flexWrap: 'wrap',
      }}>
        <Stat label="Total lessons" value={total} />
        <Stat label="Upcoming" value={upcoming.length} />
        <Stat label="Completed" value={past.length} />
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">
          Loading…
        </p>
      ) : (
        <>
          <Section title="Upcoming">
            {upcoming.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">
                Nothing booked. Head to Book a lesson to reserve a slot.
              </p>
            ) : (
              upcoming.map(s => (
                <Row key={s.id}>
                  <Time>{fmtTime(s.slot_time)}</Time>
                  <Main>{fmtDate(s.slot_date)}</Main>
                  <Pill color="green">Confirmed</Pill>
                </Row>
              ))
            )}
          </Section>

          <Section title="History">
            {past.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">
                No completed lessons yet.
              </p>
            ) : (
              past.map(s => (
                <Row key={s.id} muted>
                  <Time muted>{fmtTime(s.slot_time)}</Time>
                  <Main>{fmtDate(s.slot_date)}</Main>
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Completed</span>
                </Row>
              ))
            )}
          </Section>
        </>
      )}
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--ink-mute)',
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div className="font-serif" style={{ fontSize: 42, fontWeight: 400, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 className="font-serif" style={{
        fontSize: 18,
        fontStyle: 'italic',
        fontWeight: 400,
        margin: '0 0 16px',
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ children, muted }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '13px 0',
      borderBottom: '0.5px solid var(--rule-soft)',
      gap: 18,
      fontSize: muted ? 13 : 14,
      color: muted ? 'var(--ink-soft)' : 'inherit',
    }}>
      {children}
    </div>
  );
}

function Time({ children, muted }) {
  return (
    <div className="font-mono" style={{
      fontSize: 13,
      width: 56,
      color: muted ? 'var(--ink-mute)' : 'inherit',
    }}>
      {children}
    </div>
  );
}

function Main({ children }) {
  return <div style={{ flex: 1 }}>{children}</div>;
}
