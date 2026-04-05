'use client';

import React from 'react';

type InputStatus = 'default' | 'error' | 'success';

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'status'> {
  label?: string;
  status?: InputStatus;
  hint?: string;
  error?: string;
  resize?: 'none' | 'vertical' | 'both';
}

const statusBorderColor: Record<InputStatus, string> = {
  default: 'var(--input-border)',
  error:   'var(--red-500)',
  success: 'var(--green-500)',
};

const statusFocusRing: Record<InputStatus, string> = {
  default: '0 0 0 3px rgba(238,202,68,.14)',
  error:   '0 0 0 3px rgba(230,53,40,.12)',
  success: '0 0 0 3px rgba(20,164,87,.12)',
};

export function Textarea({
  label,
  status = 'default',
  hint,
  error,
  resize = 'vertical',
  disabled,
  id,
  rows = 4,
  style,
  className = '',
  ...props
}: TextareaProps) {
  const [focused, setFocused] = React.useState(false);
  const resolvedStatus = error ? 'error' : status;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: '.2em',
            textTransform: 'uppercase',
            color: 'var(--text-label)',
            marginBottom: 7,
            transition: 'color .3s',
          }}
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          minHeight: 90,
          borderRadius: 'var(--radius-md)',
          background: 'var(--input-bg)',
          border: `1.5px solid ${statusBorderColor[resolvedStatus]}`,
          padding: '12px 14px',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 400,
          color: 'var(--input-text)',
          outline: 'none',
          resize,
          transition: 'border-color .18s, box-shadow .18s, background .3s, color .3s',
          boxShadow: focused ? statusFocusRing[resolvedStatus] : 'none',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
          ...style,
        }}
        className={className}
        {...props}
      />
      {error && (
        <span style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 5 }}>{error}</span>
      )}
      {hint && !error && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, transition: 'color .3s' }}>{hint}</span>
      )}
    </div>
  );
}
