'use client';

import React from 'react';

type InputStatus = 'default' | 'error' | 'success';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'status'> {
  label?: string;
  status?: InputStatus;
  hint?: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
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

export function Input({
  label,
  status = 'default',
  hint,
  error,
  iconLeft,
  iconRight,
  disabled,
  id,
  className = '',
  style,
  ...props
}: InputProps) {
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
      <div style={{ position: 'relative' }}>
        {iconLeft && (
          <span
            style={{
              position: 'absolute',
              top: '50%',
              left: 13,
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              fontSize: 15,
              pointerEvents: 'none',
              display: 'flex',
            }}
          >
            {iconLeft}
          </span>
        )}
        <input
          id={id}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            height: 46,
            borderRadius: 'var(--radius-md)',
            background: 'var(--input-bg)',
            border: `1.5px solid ${statusBorderColor[resolvedStatus]}`,
            padding: `0 ${iconRight ? 40 : 14}px 0 ${iconLeft ? 40 : 14}px`,
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 400,
            color: 'var(--input-text)',
            outline: 'none',
            WebkitAppearance: 'none',
            transition: 'border-color .18s, box-shadow .18s, background .3s, color .3s',
            boxShadow: focused ? statusFocusRing[resolvedStatus] : 'none',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
            ...style,
          }}
          className={className}
          {...props}
        />
        {iconRight && (
          <span
            style={{
              position: 'absolute',
              top: '50%',
              right: 13,
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              fontSize: 15,
              pointerEvents: 'none',
              display: 'flex',
            }}
          >
            {iconRight}
          </span>
        )}
      </div>
      {error && (
        <span style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 5 }}>{error}</span>
      )}
      {hint && !error && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, transition: 'color .3s' }}>{hint}</span>
      )}
    </div>
  );
}
