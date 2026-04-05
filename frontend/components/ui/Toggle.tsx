'use client';

import React from 'react';

interface ToggleProps {
  label?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

export function Toggle({
  label,
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
  id,
}: ToggleProps) {
  const inputId = id ?? React.useId();
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const isOn = checked !== undefined ? checked : internalChecked;

  const handleClick = () => {
    if (disabled) return;
    const next = !isOn;
    if (checked === undefined) setInternalChecked(next);
    onChange?.(next);
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <button
        id={inputId}
        role="switch"
        aria-checked={isOn}
        disabled={disabled}
        onClick={handleClick}
        style={{
          width: 42,
          height: 24,
          borderRadius: 100,
          background: isOn ? 'var(--yellow-400)' : 'var(--input-border)',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'background .22s',
          flexShrink: 0,
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: 3,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,.2)',
            transition: 'transform .22s ease',
            transform: isOn ? 'translateX(18px)' : 'translateX(0)',
            display: 'block',
          }}
        />
      </button>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 13.5,
            color: 'var(--text-body)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'color .3s',
          }}
        >
          {label}
        </label>
      )}
    </div>
  );
}
