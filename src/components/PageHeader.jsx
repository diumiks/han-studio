export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div style={{ marginBottom: 36 }}>
      {eyebrow && (
        <div style={{
          fontSize: 10,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--ink-mute)',
          marginBottom: 10,
        }}>
          {eyebrow}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <h1 className="font-serif responsive-title" style={{
          fontWeight: 400,
          margin: 0,
          lineHeight: 1.1,
          letterSpacing: '-0.015em',
        }}>
          {title}
        </h1>
        {actions && <div>{actions}</div>}
      </div>
      {subtitle && (
        <p style={{
          fontSize: 14,
          color: 'var(--ink-soft)',
          marginTop: 10,
          lineHeight: 1.55,
          maxWidth: 560,
        }}>
          {subtitle}
        </p>
      )}
      <div style={{ height: 1, background: 'var(--rule)', marginTop: 24 }} />
    </div>
  );
}
