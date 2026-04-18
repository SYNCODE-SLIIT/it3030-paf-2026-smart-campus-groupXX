'use client';

import React from 'react';
import { CalendarPlus } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@/components/ui';
import { cancelMyBooking, createBooking, getErrorMessage, listMyBookings, listResources } from '@/lib/api-client';
import type { BookingResponse, BookingStatus, ResourceResponse } from '@/lib/api-types';

type NoticeState = {
  variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
  title: string;
  message: string;
} | null;

const NEW_BOOKING_INITIAL = {
  resourceId: '',
  startTime: '',
  endTime: '',
  purpose: '',
};

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
  }
}

function canCancelByRequester(booking: BookingResponse) {
  if (booking.status === 'PENDING') {
    return true;
  }

  if (booking.status !== 'APPROVED') {
    return false;
  }

  const startTime = new Date(booking.startTime).getTime();
  return Number.isFinite(startTime) && startTime > Date.now();
}

function localDateTimeToIso(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

export function RequesterBookingsScreen({
  workspaceLabel,
}: {
  workspaceLabel: 'Student Workspace' | 'Faculty Workspace';
}) {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;

  const [resources, setResources] = React.useState<ResourceResponse[]>([]);
  const [bookings, setBookings] = React.useState<BookingResponse[]>([]);
  const [form, setForm] = React.useState(NEW_BOOKING_INITIAL);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [activeBookingId, setActiveBookingId] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<NoticeState>(null);

  const reload = React.useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setLoadError('Your session is unavailable. Please sign in again.');
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const [resourceList, myBookings] = await Promise.all([
        listResources(accessToken),
        listMyBookings(accessToken),
      ]);
      setResources(resourceList);
      setBookings(myBookings);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load your bookings.'));
      setResources([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function handleCreateBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setNotice({ variant: 'error', title: 'Session unavailable', message: 'Please sign in again.' });
      return;
    }

    if (!form.resourceId) {
      setNotice({ variant: 'warning', title: 'Resource required', message: 'Select a resource before submitting.' });
      return;
    }

    const startTimeIso = localDateTimeToIso(form.startTime);
    const endTimeIso = localDateTimeToIso(form.endTime);

    if (!startTimeIso || !endTimeIso) {
      setNotice({ variant: 'warning', title: 'Invalid date/time', message: 'Enter valid start and end times.' });
      return;
    }

    if (new Date(startTimeIso).getTime() >= new Date(endTimeIso).getTime()) {
      setNotice({ variant: 'warning', title: 'Invalid range', message: 'Start time must be earlier than end time.' });
      return;
    }

    if (new Date(startTimeIso).getTime() <= Date.now()) {
      setNotice({ variant: 'warning', title: 'Future start required', message: 'Start time must be in the future.' });
      return;
    }

    setSubmitting(true);
    try {
      await createBooking(accessToken, {
        resourceId: form.resourceId,
        startTime: startTimeIso,
        endTime: endTimeIso,
        purpose: form.purpose.trim() || undefined,
      });
      setForm(NEW_BOOKING_INITIAL);
      await reload();
      setNotice({ variant: 'success', title: 'Booking requested', message: 'Your booking has been submitted for review.' });
    } catch (error) {
      setNotice({ variant: 'error', title: 'Booking failed', message: getErrorMessage(error, 'Could not create this booking.') });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelBooking(booking: BookingResponse) {
    if (!accessToken) {
      setNotice({ variant: 'error', title: 'Session unavailable', message: 'Please sign in again.' });
      return;
    }

    const confirmed = window.confirm(`Cancel booking for ${booking.resource.code}?`);
    if (!confirmed) {
      return;
    }

    const reason = window.prompt('Optional cancellation reason:')?.trim();

    setActiveBookingId(booking.id);
    try {
      await cancelMyBooking(accessToken, booking.id, reason ? { reason } : undefined);
      await reload();
      setNotice({ variant: 'success', title: 'Booking cancelled', message: 'The booking was cancelled successfully.' });
    } catch (error) {
      setNotice({ variant: 'error', title: 'Cancellation failed', message: getErrorMessage(error, 'Could not cancel this booking.') });
    } finally {
      setActiveBookingId(null);
    }
  }

  const pendingCount = bookings.filter((booking) => booking.status === 'PENDING').length;
  const approvedCount = bookings.filter((booking) => booking.status === 'APPROVED').length;

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
          {workspaceLabel}
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
          Resource Bookings
        </h1>
        <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Submit requests for campus resources and track booking decisions.
        </p>
      </div>

      {notice && (
        <Alert variant={notice.variant} title={notice.title} dismissible onDismiss={() => setNotice(null)}>
          {notice.message}
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <Card>
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Pending
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-h)' }}>
            {pendingCount}
          </p>
        </Card>
        <Card>
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Approved
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-h)' }}>
            {approvedCount}
          </p>
        </Card>
      </div>

      <Card>
        <form onSubmit={handleCreateBooking} style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 12 }}>
            <Select
              id="booking-resource"
              name="booking-resource"
              label="Resource"
              value={form.resourceId}
              onChange={(event) => setForm((current) => ({ ...current, resourceId: event.target.value }))}
              placeholder="Select resource"
              options={resources.map((resource) => ({
                value: resource.id,
                label: `${resource.code} - ${resource.name}`,
              }))}
            />
            <Input
              id="booking-start"
              name="booking-start"
              label="Start"
              type="datetime-local"
              value={form.startTime}
              onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
              required
            />
            <Input
              id="booking-end"
              name="booking-end"
              label="End"
              type="datetime-local"
              value={form.endTime}
              onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
              required
            />
          </div>

          <Textarea
            id="booking-purpose"
            name="booking-purpose"
            label="Purpose"
            placeholder="Optional reason for this booking request"
            value={form.purpose}
            onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}
            rows={3}
            resize="none"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" loading={submitting} iconLeft={<CalendarPlus size={14} />}>
              Create Booking
            </Button>
          </div>
        </form>
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
                <TableHeader>Window</TableHeader>
                <TableHeader>Purpose</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader style={{ width: 160 }}>Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && bookings.length === 0 && (
                <TableRow hoverable={false}>
                  <TableCell colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>
                    No bookings yet. Create your first request above.
                  </TableCell>
                </TableRow>
              )}

              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <strong style={{ color: 'var(--text-h)' }}>{booking.resource.code}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{booking.resource.name}</span>
                    </div>
                  </TableCell>
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
                    {booking.rejectionReason && (
                      <p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 11 }}>Rejected: {booking.rejectionReason}</p>
                    )}
                    {booking.cancellationReason && (
                      <p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 11 }}>Cancelled: {booking.cancellationReason}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip color={statusChipColor(booking.status)} dot>
                      {booking.status}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    {canCancelByRequester(booking) ? (
                      <Button
                        variant="ghost-danger"
                        size="xs"
                        loading={activeBookingId === booking.id}
                        onClick={() => {
                          void handleCancelBooking(booking);
                        }}
                      >
                        Cancel
                      </Button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No actions</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
