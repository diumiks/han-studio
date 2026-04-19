import { useEffect, useRef, useState } from 'react';
import { Bold, Underline, Link as LinkIcon, Heading } from 'lucide-react';
import { useAuth } from '../../lib/auth.jsx';
import { useSettings } from '../../hooks/useSettings.js';
import PageHeader from '../../components/PageHeader.jsx';
import Button from '../../components/Button.jsx';

export default function Policy() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { settings, update, loading } = useSettings();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const content = settings.announcements_page || '';

  useEffect(() => {
    if (!editing) setDraft(content);
  }, [content, editing]);

  const save = async () => {
    setBusy(true);
    await update('announcements_page', draft);
    setBusy(false);
    setEditing(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="Studio notices"
        title="Announcements"
        subtitle="Policy, concerto information, summer festivals, and anything else from Chi Ho."
      />

      {isAdmin && !editing && (
        <div style={{ marginBottom: 20 }}>
          <Button onClick={() => { setDraft(content); setEditing(true); }} variant="secondary" size="sm">
            Edit page
          </Button>
        </div>
      )}

      {loading && !content ? (
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">
          Loading…
        </p>
      ) : editing ? (
        <Editor draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setEditing(false)} busy={busy} />
      ) : (
        <Rendered content={content} />
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// Editor with simple toolbar (wraps selection with markers)
// -----------------------------------------------------------------------------

function Editor({ draft, setDraft, onSave, onCancel, busy }) {
  const taRef = useRef(null);

  const wrap = (before, after = before) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = draft.slice(start, end);
    const next = draft.slice(0, start) + before + sel + after + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, end + before.length);
    });
  };

  const insertLink = () => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = draft.slice(start, end) || 'link text';
    const url = prompt('Link URL (include https://):', 'https://');
    if (!url) return;
    const snippet = `[${sel}](${url})`;
    const next = draft.slice(0, start) + snippet + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + 1, start + 1 + sel.length);
    });
  };

  const insertHeading = () => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    // Find start of current line.
    const lineStart = draft.lastIndexOf('\n', start - 1) + 1;
    const next = draft.slice(0, lineStart) + '## ' + draft.slice(lineStart);
    setDraft(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + 3, start + 3);
    });
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 10,
        padding: 4,
        border: '0.5px solid var(--rule)',
        borderRadius: 2,
        background: 'var(--paper-soft)',
        flexWrap: 'wrap',
      }}>
        <ToolbarBtn onClick={insertHeading} title="Heading"><Heading size={13} strokeWidth={1.6} /> Heading</ToolbarBtn>
        <ToolbarBtn onClick={() => wrap('**')} title="Bold"><Bold size={13} strokeWidth={1.6} /> Bold</ToolbarBtn>
        <ToolbarBtn onClick={() => wrap('__')} title="Underline"><Underline size={13} strokeWidth={1.6} /> Underline</ToolbarBtn>
        <ToolbarBtn onClick={insertLink} title="Link"><LinkIcon size={13} strokeWidth={1.6} /> Link</ToolbarBtn>
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--ink-mute)', margin: '0 0 10px' }}>
        Markdown shortcuts: <code>## Heading</code>, <code>**bold**</code>, <code>__underline__</code>, <code>[text](https://url)</code>. Blank lines separate paragraphs.
      </p>
      <textarea
        ref={taRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={28}
        style={{
          width: '100%',
          padding: 14,
          fontSize: 13.5,
          lineHeight: 1.6,
          border: '1px solid var(--rule)',
          borderRadius: 2,
          background: 'var(--paper)',
          resize: 'vertical',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Button onClick={onSave} size="sm" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        <Button onClick={onCancel} variant="ghost" size="sm">Cancel</Button>
      </div>
    </div>
  );
}

function ToolbarBtn({ onClick, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 10px',
        fontSize: 12,
        color: 'var(--ink-soft)',
        border: '0.5px solid transparent',
        borderRadius: 2,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--paper)'; e.currentTarget.style.borderColor = 'var(--rule)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
    >
      {children}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Render — minimal markdown: headings, bold, underline, links, paragraphs.
// -----------------------------------------------------------------------------

function Rendered({ content }) {
  if (!content.trim()) {
    return (
      <p style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }} className="font-serif">
        Nothing posted yet.
      </p>
    );
  }

  const blocks = content.split(/\n\s*\n/);

  return (
    <div style={{ maxWidth: 640, fontSize: 14.5, lineHeight: 1.75, color: 'var(--ink-soft)' }}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={i} className="font-serif" style={{
              fontSize: 22,
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'var(--ink)',
              margin: i === 0 ? '0 0 16px' : '40px 0 16px',
            }}>
              {renderInline(trimmed.slice(3).trim())}
            </h2>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={i} className="font-serif" style={{
              fontSize: 28,
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'var(--ink)',
              margin: i === 0 ? '0 0 20px' : '48px 0 20px',
            }}>
              {renderInline(trimmed.slice(2).trim())}
            </h1>
          );
        }
        return (
          <p key={i} style={{ margin: '0 0 18px' }}>
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// Inline parser: **bold**, __underline__, [text](url). Newlines → <br>.
// Tokenises by scanning for the nearest next marker, so markers can nest
// predictably and order doesn't matter.
function renderInline(text) {
  const nodes = [];
  let key = 0;

  const splitLines = (s) => {
    const out = [];
    const parts = s.split('\n');
    parts.forEach((line, idx) => {
      if (line) out.push(line);
      if (idx < parts.length - 1) out.push({ br: true });
    });
    return out;
  };

  const pushStyled = (str, style, tag) => {
    splitLines(str).forEach(item => {
      if (item.br) nodes.push(<br key={`k${key++}`} />);
      else if (tag === 'a') nodes.push(
        <a key={`k${key++}`} href={style.href} target="_blank" rel="noopener noreferrer" style={{
          color: 'var(--accent)',
          textDecoration: 'underline',
          textUnderlineOffset: 2,
        }}>{item}</a>
      );
      else if (tag === 'strong') nodes.push(
        <strong key={`k${key++}`} style={{ color: 'var(--ink)', fontWeight: 600 }}>{item}</strong>
      );
      else if (tag === 'u') nodes.push(
        <span key={`k${key++}`} style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>{item}</span>
      );
      else nodes.push(<span key={`k${key++}`}>{item}</span>);
    });
  };

  let remaining = text;
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/;
  const boldRe = /\*\*([^*]+)\*\*/;
  const uRe = /__([^_]+)__/;

  while (remaining.length) {
    const candidates = [];
    const lm = remaining.match(linkRe);
    if (lm) candidates.push({ type: 'a', m: lm });
    const bm = remaining.match(boldRe);
    if (bm) candidates.push({ type: 'strong', m: bm });
    const um = remaining.match(uRe);
    if (um) candidates.push({ type: 'u', m: um });

    if (candidates.length === 0) {
      pushStyled(remaining, null, 'span');
      break;
    }
    // Pick the earliest match.
    candidates.sort((a, b) => a.m.index - b.m.index);
    const first = candidates[0];
    const { m, type } = first;
    if (m.index > 0) pushStyled(remaining.slice(0, m.index), null, 'span');
    if (type === 'a') pushStyled(m[1], { href: m[2] }, 'a');
    else pushStyled(m[1], null, type);
    remaining = remaining.slice(m.index + m[0].length);
  }
  return nodes;
}
