import PageHeader from '../../components/PageHeader.jsx';

export default function Policy() {
  return (
    <>
      <PageHeader
        eyebrow="Studio guidelines"
        title="Cancellation policy"
        subtitle="A few gentle rules to keep the studio running smoothly."
      />
      <div style={{ maxWidth: 600, fontSize: 14.5, lineHeight: 1.75, color: 'var(--ink-soft)' }}>
        <p className="font-serif" style={{
          fontSize: 20,
          fontStyle: 'italic',
          color: 'var(--ink)',
          lineHeight: 1.5,
          margin: '0 0 36px',
          borderLeft: '2px solid var(--ink)',
          paddingLeft: 20,
        }}>
          Your lesson time is protected for you alone. Please give others the chance to use it if you cannot.
        </p>

        <Heading>Cancelling your own lesson</Heading>
        <p style={{ margin: '0 0 24px' }}>
          You may cancel a booked lesson at any time through this app. The slot returns to the pool for someone else to take. There is no penalty.
        </p>

        <Heading>Swapping with another student</Heading>
        <p style={{ margin: '0 0 24px' }}>
          If you need to trade times with a studio mate, arrange it directly over email or text. Once you've agreed, both of you can simply cancel and rebook in this app; the system will register the change.
        </p>

        <Heading>Late cancellations</Heading>
        <p style={{ margin: '0 0 24px' }}>
          Please try to give at least 24 hours' notice when possible. Life happens — illness, emergencies, recitals — and Chi Ho understands. A short note is always appreciated.
        </p>

        <Heading>If Chi Ho cancels</Heading>
        <p style={{ margin: '0' }}>
          When Chi Ho has to cancel a week of lessons (conferences, competitions, illness), you'll receive a note at the top of the Book a lesson page and the affected slots will disappear. A make-up week is typically offered the following month.
        </p>
      </div>
    </>
  );
}

function Heading({ children }) {
  return (
    <h3 className="font-serif" style={{
      fontSize: 16,
      fontStyle: 'italic',
      fontWeight: 400,
      margin: '0 0 10px',
      color: 'var(--ink)',
    }}>
      {children}
    </h3>
  );
}
