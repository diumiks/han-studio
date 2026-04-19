export default function Pill({ children, color = 'neutral', style = {} }) {
  const palettes = {
    neutral: { bg: 'var(--paper-soft)', fg: 'var(--ink-soft)', border: 'var(--rule)' },
    green: { bg: 'var(--green-soft)', fg: 'var(--green)', border: '#B5C5BC' },
    accent: { bg: '#F5E1DC', fg: 'var(--accent)', border: '#E0BAB0' },
    dark: { bg: 'var(--ink)', fg: 'var(--paper)', border: 'var(--ink)' },
  };
  const p = palettes[color];
  return (
    <span style={{
      fontSize: 10.5,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontWeight: 500,
      padding: '3px 8px',
      background: p.bg,
      color: p.fg,
      border: `0.5px solid ${p.border}`,
      borderRadius: 2,
      fontFamily: 'Inter, sans-serif',
      display: 'inline-block',
      ...style,
    }}>
      {children}
    </span>
  );
}
