'use client';

import React from 'react';
import { LayoutDashboard } from 'lucide-react';

import { Card, Chip } from '@/components/ui';

type ChipColor = 'yellow' | 'red' | 'green' | 'blue' | 'orange' | 'neutral' | 'glass';

interface WorkspacePlaceholderScreenProps {
  eyebrow: string;
  title: string;
  description: string;
  roleLabel: string;
  chipColor?: ChipColor;
  details?: Array<{ label: string; value: string }>;
}

export function WorkspacePlaceholderScreen({
  eyebrow,
  title,
  description,
  roleLabel,
  chipColor = 'neutral',
  details = [],
}: WorkspacePlaceholderScreenProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p
            style={{
              margin: '0 0 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '.32em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            {eyebrow}
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: 0,
              lineHeight: 1.1,
              color: 'var(--text-h)',
            }}
          >
            {title}
          </h1>
          <p style={{ margin: '8px 0 0', maxWidth: 680, color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
            {description}
          </p>
        </div>

        <Chip color={chipColor} dot>
          {roleLabel}
        </Chip>
      </div>

      <section
        aria-label={`${title} summary`}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              aria-hidden="true"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(238,202,68,.14)',
                color: 'var(--yellow-700)',
                flexShrink: 0,
              }}
            >
              <LayoutDashboard size={20} strokeWidth={2.2} />
            </span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: 'var(--text-h)' }}>Workspace</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Ready for module content</p>
            </div>
          </div>
        </Card>

        {details.map((item) => (
          <Card key={item.label}>
            <p
              style={{
                margin: '0 0 8px',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              {item.label}
            </p>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-h)' }}>
              {item.value}
            </p>
          </Card>
        ))}
      </section>
    </div>
  );
}
