'use client';

import React from 'react';

import { Card, Chip } from '@/components/ui';

export function LoginSideCards() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
      {/* Dark card */}
      <Card variant="dark" hoverable style={{ flex: 1 }}>
        <div style={{ marginBottom: 16 }}>
          <Chip color="glass" size="sm">
            New to Smart Campus?
          </Chip>
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 700,
            lineHeight: 1.25,
            margin: '0 0 12px',
            color: 'var(--text-on-contrast)',
          }}
        >
          Your campus. Simplified.
        </h2>
        <p
          style={{
            margin: '0 0 28px',
            color: 'var(--text-on-contrast-muted)',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          Request access to Smart Campus for centralised student management, room scheduling,
          resource allocation, and real-time institutional reporting — all in one place.
        </p>
        <a
          href="mailto:support@smartcampus.edu"
          style={{
            display: 'block',
            width: '100%',
            padding: '14px 24px',
            border: '1px solid rgba(238,202,68,.35)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(238,202,68,.1)',
            color: 'var(--yellow-300)',
            textAlign: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            transition: 'background .15s, border-color .15s',
            boxSizing: 'border-box',
          }}
        >
          Contact IT Support
        </a>
      </Card>

      {/* Mini grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Stat card */}
        <Card hoverable>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              minHeight: 96,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 800,
                lineHeight: 1,
                marginBottom: 4,
                color: 'var(--text-h)',
              }}
            >
              4,800<span style={{ color: 'var(--yellow-400)' }}>+</span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}
            >
              Students
              <br />
              Enrolled
            </div>
          </div>
        </Card>

        {/* Quote card */}
        <Card hoverable>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: 96,
            }}
          >
            <p
              style={{
                margin: '0 0 8px',
                color: 'var(--text-body)',
                fontSize: 11,
                fontStyle: 'italic',
                fontWeight: 500,
                lineHeight: 1.6,
                opacity: 0.7,
              }}
            >
              &ldquo;Streamlined everything our department manages daily.&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--yellow-400)',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                Faculty Coordinator
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
