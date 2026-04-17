'use client';

import React from 'react';

export function Table({
  children,
  style,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 13,
        ...style,
      }}
      {...props}
    >
      {children}
    </table>
  );
}

export function TableHead({
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props}>{children}</thead>;
}

export function TableBody({
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props}>{children}</tbody>;
}

export function TableRow({
  children,
  hoverable = true,
  style,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { hoverable?: boolean }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <tr
      onMouseEnter={hoverable ? () => setHovered(true) : undefined}
      onMouseLeave={hoverable ? () => setHovered(false) : undefined}
      style={{
        transition: 'background .15s ease',
        background: hoverable && hovered ? 'rgba(238,202,68,.06)' : 'transparent',
        ...style,
      }}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeader({
  children,
  style,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '12px 14px',
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        letterSpacing: '.16em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        borderBottom: '1px solid var(--border)',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  label,
  style,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { label?: boolean }) {
  return (
    <td
      style={{
        padding: '14px',
        borderBottom: '1px solid rgba(20,18,12,.08)',
        color: label ? 'var(--text-muted)' : 'var(--text-body)',
        verticalAlign: 'middle',
        fontFamily: label ? 'var(--font-mono)' : undefined,
        fontSize: label ? 11 : undefined,
        letterSpacing: label ? '.12em' : undefined,
        textTransform: label ? 'uppercase' : undefined,
        width: label ? 140 : undefined,
        whiteSpace: label ? 'nowrap' : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </td>
  );
}
