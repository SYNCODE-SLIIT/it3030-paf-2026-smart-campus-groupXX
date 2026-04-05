'use client';

import React from 'react';

type InputStatus = 'default' | 'error' | 'success';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'status'> {
  label?: string;
  options: SelectOption[];
  status?: InputStatus;
  hint?: string;
  error?: string;
  placeholder?: string;
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

// Chevron SVG as data URL
const chevronBg = `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23ABA79C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;

export function Select({
  label,
  options,
  status = 'default',
  hint,
  error,
  placeholder,
  disabled,
  id,
  style,
  className = '',
  ...props
}: SelectProps) {
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
      <select
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
          padding: '0 36px 0 14px',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 400,
          color: 'var(--input-text)',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          backgroundImage: chevronBg,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 14px center',
          transition: 'border-color .18s, box-shadow .18s, background .3s, color .3s',
          boxShadow: focused ? statusFocusRing[resolvedStatus] : 'none',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          ...style,
        }}
        className={className}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 5 }}>{error}</span>
      )}
      {hint && !error && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, transition: 'color .3s' }}>{hint}</span>
      )}
    </div>
  );
}
