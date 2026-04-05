'use client';

import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Checkbox({ label, id, style, ...props }: CheckboxProps) {
  const inputId = id ?? React.useId();

  return (
    <label
      htmlFor={inputId}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.5 : 1,
      }}
    >
      <input
        type="checkbox"
        id={inputId}
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: '1.5px solid var(--input-border)',
          background: 'var(--input-bg)',
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          flexShrink: 0,
          accentColor: 'var(--yellow-400)',
          transition: 'border-color .15s',
          ...style,
        }}
        {...props}
      />
      {label && (
        <span
          style={{
            fontSize: 13.5,
            color: 'var(--text-body)',
            userSelect: 'none',
            transition: 'color .3s',
          }}
        >
          {label}
        </span>
      )}
    </label>
  );
}
