export default function Button({ children, onClick, variant = 'primary', size = 'md', disabled, style = {}, type }) {
  const base = {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    letterSpacing: '-0.005em',
    borderRadius: 2,
    transition: 'all 120ms ease',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    whiteSpace: 'nowrap',
  };
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 12 },
    md: { padding: '9px 18px', fontSize: 13 },
    lg: { padding: '12px 24px', fontSize: 14 },
  };
  const variants = {
    primary: { background: 'var(--ink)', color: 'var(--paper)', border: '1px solid var(--ink)' },
    secondary: { background: 'transparent', color: 'var(--ink)', border: '1px solid var(--ink)' },
    ghost: { background: 'transparent', color: 'var(--ink-soft)', border: '1px solid transparent' },
    danger: { background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)' },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.transform = 'translateY(-1px)')}
      onMouseLeave={e => !disabled && (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {children}
    </button>
  );
}
