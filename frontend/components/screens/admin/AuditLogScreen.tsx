'use client';

import React from 'react';
import { Activity, Filter, History } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { AuditLogTimeline } from '@/components/screens/admin/AuditLogTimeline';
import { Alert, Button, Card, Input, Select, Skeleton } from '@/components/ui';
import { getErrorMessage, listAuditLogs } from '@/lib/api-client';
import type { AdminAction, AuditLogResponse } from '@/lib/api-types';

const PAGE_SIZE = 20;

const actionOptions: Array<{ value: AdminAction | ''; label: string }> = [
  { value: '', label: 'All actions' },
  { value: 'USER_CREATED', label: 'User Created' },
  { value: 'USER_UPDATED', label: 'User Updated' },
  { value: 'USER_SUSPENDED', label: 'User Suspended' },
  { value: 'USER_ACTIVATED', label: 'User Activated' },
  { value: 'USER_DELETED', label: 'User Deleted' },
  { value: 'INVITE_RESENT', label: 'Invite Resent' },
  { value: 'MANAGER_ROLE_CHANGED', label: 'Manager Role Changed' },
];

function toStartOfDayIso(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`).toISOString();
}

function toEndOfDayIso(dateValue: string) {
  return new Date(`${dateValue}T23:59:59`).toISOString();
}

export function AuditLogScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;

  const [logs, setLogs] = React.useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const [actionFilter, setActionFilter] = React.useState<AdminAction | ''>('');
  const [performedByFilter, setPerformedByFilter] = React.useState('');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');

  const [page, setPage] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);
  const [totalElements, setTotalElements] = React.useState(0);
  const [hasNext, setHasNext] = React.useState(false);

  const loadLogs = React.useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setError('The admin session is unavailable. Please sign in again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await listAuditLogs(accessToken, {
        action: actionFilter,
        performedById: performedByFilter.trim() || undefined,
        from: fromDate ? toStartOfDayIso(fromDate) : undefined,
        to: toDate ? toEndOfDayIso(toDate) : undefined,
        page,
        size: PAGE_SIZE,
      });

      setLogs(response.items);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
      setHasNext(response.hasNext);
      setExpandedIds(new Set());
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'We could not load audit activity.'));
      setLogs([]);
      setTotalPages(0);
      setTotalElements(0);
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  }, [accessToken, actionFilter, performedByFilter, fromDate, toDate, page]);

  React.useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function resetFilters() {
    setActionFilter('');
    setPerformedByFilter('');
    setFromDate('');
    setToDate('');
    setPage(0);
  }

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p
            style={{
              margin: '0 0 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '.35em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Administration
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              fontWeight: 900,
              lineHeight: 1.1,
              color: 'var(--text-h)',
            }}
          >
            Audit Log
          </h1>
          <p style={{ margin: '7px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Track every privileged user-management action with timestamped event details.
          </p>
        </div>

        <Card style={{ minWidth: 210, padding: 14 }}>
          <div style={{ display: 'grid', gap: 7 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-h)' }}>
              <Activity size={16} color="var(--yellow-700)" />
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Total Events</strong>
            </span>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 30,
                fontWeight: 900,
                color: 'var(--text-h)',
              }}
            >
              {totalElements}
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 850, color: 'var(--text-h)' }}>
              Filters
            </p>
            <Button variant="ghost" size="xs" iconLeft={<Filter size={13} />} onClick={resetFilters}>
              Clear
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <Select
              label="Action"
              value={actionFilter}
              onChange={(event) => {
                setActionFilter(event.target.value as AdminAction | '');
                setPage(0);
              }}
              options={actionOptions}
            />

            <Input
              label="Performed By (Admin UUID)"
              placeholder="Optional actor ID"
              value={performedByFilter}
              onChange={(event) => {
                setPerformedByFilter(event.target.value);
                setPage(0);
              }}
            />

            <Input
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(0);
              }}
            />

            <Input
              label="To Date"
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(0);
              }}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 850, color: 'var(--text-h)' }}>
              Activity Timeline
            </p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
              <History size={14} />
              Page {Math.max(page + 1, 1)} of {Math.max(totalPages, 1)}
            </span>
          </div>

          {error && (
            <Alert variant="error" title="Audit log unavailable">
              {error}
            </Alert>
          )}

          {loading ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <Skeleton variant="rect" height={90} />
              <Skeleton variant="rect" height={90} />
              <Skeleton variant="rect" height={90} />
            </div>
          ) : (
            <AuditLogTimeline
              logs={logs}
              expandedIds={expandedIds}
              onToggleDetails={toggleExpanded}
              emptyMessage="No activity matches the current filters."
            />
          )}

          {!loading && !error && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Showing page {page + 1} of {totalPages}
              </span>
              <div style={{ display: 'inline-flex', gap: 8 }}>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={page <= 0}
                  onClick={() => setPage((current) => Math.max(current - 1, 0))}
                >
                  Previous
                </Button>
                <Button
                  variant="subtle"
                  size="xs"
                  disabled={!hasNext}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
