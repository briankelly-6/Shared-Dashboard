import { useEffect, useState } from 'react';

interface InlineTextProps {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  className?: string;
  /** Render with line-through (used for "done" rows). */
  strike?: boolean;
  multiline?: boolean;
  ariaLabel?: string;
}

/**
 * A borderless inline-editable text field. Edits are buffered locally while
 * focused and committed on blur / Enter, so incoming realtime updates from
 * other devices never clobber what someone is actively typing. Escape reverts.
 */
export function InlineText({
  value,
  onCommit,
  placeholder,
  className = '',
  strike = false,
  multiline = false,
  ariaLabel,
}: InlineTextProps) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  // Sync external changes in only while the field is not being edited.
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    if (draft !== value) onCommit(draft);
  };

  const base =
    'w-full bg-transparent px-1 py-0.5 text-neutral-900 placeholder:text-neutral-400 focus:bg-navy-100';
  const strikeCls = strike ? 'line-through text-red-600' : '';
  const cls = `${base} ${strikeCls} ${className}`;

  if (multiline) {
    return (
      <textarea
        aria-label={ariaLabel ?? placeholder}
        value={draft}
        placeholder={placeholder}
        rows={2}
        onFocus={() => setFocused(true)}
        onBlur={commit}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setDraft(value);
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
        // content-center vertically centers the text within the fixed two-row
        // box (so a short value sits centered like the single-line fields); a
        // value long enough to overflow still anchors its first line at the top.
        className={`${cls} resize-none content-center`}
      />
    );
  }

  return (
    <input
      type="text"
      aria-label={ariaLabel ?? placeholder}
      value={draft}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={commit}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          setDraft(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cls}
    />
  );
}
