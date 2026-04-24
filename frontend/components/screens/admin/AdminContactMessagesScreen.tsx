'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Mail, MapPin, Phone } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card } from '@/components/ui';
import { getErrorMessage, listAdminContactMessages } from '@/lib/api-client';
import type { ContactMessageResponse } from '@/lib/api-types';

const PAGE_SIZE = 15;

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdminContactMessagesScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [page, setPage] = React.useState(0);
  const [data, setData] = React.useState<{
    items: ContactMessageResponse[];
    totalPages: number;
    totalElements: number;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!accessToken) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listAdminContactMessages(accessToken, page, PAGE_SIZE)
      .then((res) => {
        if (!cancelled) {
          setData({
            items: res.items,
            totalPages: res.totalPages,
            totalElements: res.totalElements,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err));
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, page]);

  const canPrev = page > 0;
  const canNext = data != null && page < Math.max(0, data.totalPages - 1);

  return (
    <div style={{ display: 'grid', gap: 22, maxWidth: 920, margin: '0 auto', padding: '8px 0 48px' }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(26px, 3vw, 34px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: 'var(--text-h)',
            margin: 0,
          }}
        >
          Contact Us
        </h1>
        <p style={{ margin: 0, color: 'var(--text-body)', lineHeight: 1.7, maxWidth: 640 }}>
          Messages submitted from the public contact page. Reach people directly using the email or phone they
          provided.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {loading ? (
        <Card style={{ padding: 28 }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Loading messages…</p>
        </Card>
      ) : data && data.items.length === 0 ? (
        <Card style={{ padding: 28 }}>
          <p style={{ margin: 0, color: 'var(--text-body)' }}>No contact messages yet.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {data?.items.map((row) => (
            <Card key={row.id} style={{ padding: '18px 20px' }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: 10,
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: 17,
                      color: 'var(--text-h)',
                    }}
                  >
                    {row.title}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {formatWhen(row.createdAt)}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-body)' }}>{row.fullName}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  <a
                    href={`mailto:${encodeURIComponent(row.email)}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      color: 'var(--blue-400)',
                      textDecoration: 'none',
                    }}
                  >
                    <Mail size={15} />
                    {row.email}
                  </a>
                  {row.phone ? (
                    <a
                      href={`tel:${row.phone.replace(/\s+/g, '')}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        color: 'var(--text-body)',
                        textDecoration: 'none',
                      }}
                    >
                      <Phone size={15} />
                      {row.phone}
                    </a>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                      <Phone size={15} />
                      No phone provided
                    </span>
                  )}
                </div>
                <p
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontSize: 14,
                    lineHeight: 1.75,
                    color: 'var(--text-body)',
                    maxHeight: 220,
                    overflow: 'auto',
                  }}
                >
                  {row.message}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {data != null && data.totalElements > 0 ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Page {page + 1} of {Math.max(1, data.totalPages)} · {data.totalElements.toLocaleString()} total
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" variant="subtle" disabled={!canPrev} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={18} style={{ marginRight: 4 }} />
              Previous
            </Button>
            <Button type="button" variant="subtle" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
              Next
              <ChevronRight size={18} style={{ marginLeft: 4 }} />
            </Button>
          </div>
        </div>
      ) : null}

      <Card style={{ padding: '18px 20px', borderStyle: 'dashed' as const }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <MapPin size={18} color="var(--yellow-400)" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--text-body)' }}>
            Public enquiries list the campus location as <strong style={{ color: 'var(--text-h)' }}>SLIIT</strong>, New
            Kandy Road, Malabe — use this context when coordinating follow-ups.
          </p>
        </div>
      </Card>
    </div>
  );
}
