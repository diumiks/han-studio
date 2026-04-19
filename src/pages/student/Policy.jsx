import { useEffect, useState } from 'react';
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
// Editor
// -----------------------------------------------------------------------------

function Editor({ draft, setDraft, onSave, onCancel, busy }) {
  return (
    <div style={{ maxWidth: 720 }}>
      <p style={{ fontSize: 11.5, color: 'var(--ink-mute)', margin: '0 0 10px' }}>
        Formatting: lines starting with <code>## </code> become section headings. Wrap text in <code>**double asterisks**</code> for bold. Blank lines separate paragraphs.
      </p>
      <textarea
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

// -----------------------------------------------------------------------------
// Render — minimal markdown: ## headings, **bold**, paragraphs, blank-line separated.
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
              {trimmed.slice(3).trim()}
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
              {trimmed.slice(2).trim()}
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

// Very small inline parser: **bold** → <strong>. Newlines inside a paragraph → <br>.
function renderInline(text) {
  const nodes = [];
  const lines = text.split('\n');
  lines.forEach((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    parts.forEach((part, partIdx) => {
      const key = `${lineIdx}-${partIdx}`;
      if (part.startsWith('**') && part.endsWith('**')) {
        nodes.push(
          <strong key={key} style={{ color: 'var(--ink)', fontWeight: 600 }}>
            {part.slice(2, -2)}
          </strong>
        );
      } else if (part) {
        nodes.push(<span key={key}>{part}</span>);
      }
    });
    if (lineIdx < lines.length - 1) nodes.push(<br key={`br-${lineIdx}`} />);
  });
  return nodes;
}
