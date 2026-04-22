'use client';

import React from 'react';
import { Check, Search, X } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert, Button, Card, Chip, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { BookingScreenSkeleton } from '@/components/booking/BookingScreenSkeleton';
import { approveBooking, cancelApprovedBookingAsManager, getErrorMessage, listAllBookings, listResources, rejectBooking } from '@/lib/api-client';
import type { BookingResponse, BookingStatus, ResourceResponse } from '@/lib/api-types';

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function statusChipColor(status: BookingStatus): 'yellow' | 'green' | 'red' | 'neutral' {
  switch (status) {
    case 'PENDING':
      return 'yellow';
    case 'APPROVED':
      return 'green';
    case 'REJECTED':
      return 'red';
    case 'CANCELLED':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function shortId(value: string) {
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

export function ManagerBookingsScreen() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.access_token ?? null;

  const [bookings, setBookings] = React.useState<BookingResponse[]>([]);
  const [resources, setResources] = React.useState<ResourceResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [activeBookingId, setActiveBookingId] = React.useState<string | null>(null);

  const [statusFilter, setStatusFilter] = React.useState<BookingStatus | ''>('');
  const [resourceFilter, setResourceFilter] = React.useState('');
  const [searchText, setSearchText] = React.useState('');
  const deferredSearch = React.useDeferredValue(searchText);

  const reload = React.useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setLoadError('The manager session is unavailable. Please sign in again.');
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const [allBookings, availableResources] = await Promise.all([
        listAllBookings(accessToken),
        listResources(accessToken),
      ]);
      setBookings(allBookings);
      setResources(availableResources);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load bookings.'));
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const filteredBookings = React.useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();

    return bookings.filter((booking) => {
      if (statusFilter && booking.status !== statusFilter) {
        return false;
      }

      if (resourceFilter && booking.resource.id !== resourceFilter) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return (
        booking.resource.code.toLowerCase().includes(needle)
        || booking.resource.name.toLowerCase().includes(needle)
        || (booking.purpose ?? '').toLowerCase().includes(needle)
        || booking.requesterId.toLowerCase().includes(needle)
      );
    });
  }, [bookings, deferredSearch, resourceFilter, statusFilter]);

  const pendingCount = bookings.filter((booking) => booking.status === 'PENDING').length;
  const approvedCount = bookings.filter((booking) => booking.status === 'APPROVED').length;
  const rejectedCount = bookings.filter((booking) => booking.status === 'REJECTED').length;
  const cancelledCount = bookings.filter((booking) => booking.status === 'CANCELLED').length;

  if (loading) {
    return <BookingScreenSkeleton variant="manager" />;
  }

  async function handleApprove(booking: BookingResponse) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    setActiveBookingId(booking.id);
    try {
      await approveBooking(accessToken, booking.id);
      await reload();
      showToast('success', 'Booking approved', `${booking.resource.code} has been approved.`);
    } catch (error) {
      showToast('error', 'Approval failed', getErrorMessage(error, 'Could not approve this booking.'));
    } finally {
      setActiveBookingId(null);
    }
  }

  async function handleReject(booking: BookingResponse) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    const reason = window.prompt('Provide a rejection reason:');
    if (!reason?.trim()) {
      showToast('warning', 'Reason required', 'A rejection reason is required.');
      return;
    }

    setActiveBookingId(booking.id);
    try {
      await rejectBooking(accessToken, booking.id, { reason: reason.trim() });
      await reload();
      showToast('success', 'Booking rejected', `${booking.resource.code} was rejected.`);
    } catch (error) {
      showToast('error', 'Rejection failed', getErrorMessage(error, 'Could not reject this booking.'));
    } finally {
      setActiveBookingId(null);
    }
  }

  async function handleCancelApproved(booking: BookingResponse) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    const confirmed = window.confirm(`Cancel approved booking ${booking.resource.code}?`);
    if (!confirmed) {
      return;
    }

    const reason = window.prompt('Optional cancellation reason:')?.trim();

    setActiveBookingId(booking.id);
    try {
      await cancelApprovedBookingAsManager(accessToken, booking.id, reason ? { reason } : undefined);
      await reload();
      showToast('success', 'Booking cancelled', `${booking.resource.code} was cancelled.`);
    } catch (error) {
      showToast('error', 'Cancellation failed', getErrorMessage(error, 'Could not cancel this booking.'));
    } finally {
      setActiveBookingId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
          Manager Workspace
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
          Booking Management
        </h1>
        <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Review booking requests, manage approvals, and keep resource schedules conflict-free.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
        }}
      >
        {[
          { label: 'Pending', value: pendingCount.toString() },
          { label: 'Approved', value: approvedCount.toString() },
          { label: 'Rejected', value: rejectedCount.toString() },
          { label: 'Cancelled', value: cancelledCount.toString() },
        ].map((item) => (
          <Card key={item.label}>
            <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              {item.label}
            </p>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-h)' }}>
              {item.value}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <Input
            id="manager-booking-search"
            name="manager-booking-search"
            label="Search"
            placeholder="Search by resource, purpose, requester id"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            iconLeft={<Search size={14} />}
            autoComplete="off"
          />
          <Select
            id="manager-booking-status"
            name="manager-booking-status"
            label="Status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as BookingStatus | '')}
            placeholder="All statuses"
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
          <Select
            id="manager-booking-resource"
            name="manager-booking-resource"
            label="Resource"
            value={resourceFilter}
            onChange={(event) => setResourceFilter(event.target.value)}
            placeholder="All resources"
            options={resources.map((resource) => ({
              value: resource.id,
              label: `${resource.code} - ${resource.name}`,
            }))}
          />
        </div>
      </Card>

      <Card>
        {loadError && (
          <Alert variant="error" title="Load failed" style={{ marginBottom: 16 }}>
            {loadError}
          </Alert>
        )}

        <div style={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow hoverable={false}>
                <TableHeader>Resource</TableHeader>
                <TableHeader>Requester</TableHeader>
                <TableHeader>Window</TableHeader>
                <TableHeader>Purpose</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader style={{ width: 260 }}>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && filteredBookings.length === 0 && (
                <TableRow hoverable={false}>
                  <TableCell colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>
                    No bookings found for the current filters.
                  </TableCell>
                </TableRow>
              )}

              {filteredBookings.map((booking) => {
                const actionBusy = activeBookingId === booking.id;
                return (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div style={{ display: 'grid', gap: 4 }}>
                        <strong style={{ color: 'var(--text-h)' }}>{booking.resource.code}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{booking.resource.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{shortId(booking.requesterId)}</TableCell>
                    <TableCell>
                      <div style={{ display: 'grid', gap: 4, fontSize: 12 }}>
                        <span>{formatDateTime(booking.startTime)}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{formatDateTime(booking.endTime)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span style={{ color: booking.purpose ? 'var(--text-body)' : 'var(--text-muted)' }}>
                        {booking.purpose ?? 'No purpose provided'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Chip color={statusChipColor(booking.status)} dot>
                        {booking.status}
                      </Chip>
                      {booking.rejectionReason && (
                        <p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 11 }}>Reason: {booking.rejectionReason}</p>
                      )}
                      {booking.cancellationReason && (
                        <p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 11 }}>Cancelled: {booking.cancellationReason}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {booking.status === 'PENDING' && (
                          <>
                            <Button
                              size="xs"
                              variant="success"
                              iconLeft={<Check size={13} />}
                              loading={actionBusy}
                              onClick={() => {
                                void handleApprove(booking);
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost-danger"
                              iconLeft={<X size={13} />}
                              loading={actionBusy}
                              onClick={() => {
                                void handleReject(booking);
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {booking.status === 'APPROVED' && (
                          <Button
                            size="xs"
                            variant="ghost-danger"
                            loading={actionBusy}
                            onClick={() => {
                              void handleCancelApproved(booking);
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                        {booking.status !== 'PENDING' && booking.status !== 'APPROVED' && (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No actions</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
