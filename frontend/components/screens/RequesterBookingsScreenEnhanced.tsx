'use client';

import React from 'react';
import { Bell, CalendarPlus, RotateCw, Plus } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import {
  Alert,
  Button,
  Card,
  Chip,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  Dialog,
} from '@/components/ui';
import {
  cancelMyBooking,
  checkInBooking,
  createBooking,
  createRecurringBooking,
  getErrorMessage,
  listBookingNotifications,
  listMyBookings,
  listMyRecurringBookings,
  listResources,
  markNotificationAsRead,
  requestBookingModification,
} from '@/lib/api-client';
import type { BookingResponse, BookingStatus, ResourceResponse, RecurringBookingResponse, BookingNotificationResponse } from '@/lib/api-types';
import { RecurringBookingForm } from '@/components/booking/RecurringBookingForm';
import { BookingModificationModal } from '@/components/booking/BookingModificationModal';
import { BookingCheckInPanel } from '@/components/booking/BookingCheckInPanel';
import { NotificationCenter } from '@/components/booking/NotificationCenter';
import { BookingCalendar } from '@/components/booking/BookingCalendar';

type TabType = 'bookings' | 'recurring' | 'calendar' | 'notifications';

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

function statusChipColor(status: BookingStatus): 'yellow' | 'green' | 'red' | 'neutral' | 'blue' {
  switch (status) {
    case 'PENDING':
      return 'yellow';
    case 'APPROVED':
      return 'green';
    case 'CHECKED_IN':
    case 'COMPLETED':
      return 'blue';
    case 'REJECTED':
    case 'CANCELLED':
    case 'NO_SHOW':
      return 'red';
    default:
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

export function RequesterBookingsScreenEnhanced({
  workspaceLabel,
}: {
  workspaceLabel: 'Student Workspace' | 'Faculty Workspace';
}) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.access_token ?? null;

  // State
  const [resources, setResources] = React.useState<ResourceResponse[]>([]);
  const [bookings, setBookings] = React.useState<BookingResponse[]>([]);
  const [recurringBookings, setRecurringBookings] = React.useState<RecurringBookingResponse[]>([]);
  const [notifications, setNotifications] = React.useState<BookingNotificationResponse[]>([]);
  const [form, setForm] = React.useState(NEW_BOOKING_INITIAL);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabType>('bookings');
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Modals
  const [showRecurringForm, setShowRecurringForm] = React.useState(false);
  const [showModificationModal, setShowModificationModal] = React.useState(false);
  const [modificationBooking, setModificationBooking] = React.useState<BookingResponse | null>(null);
  const [checkInBookingId, setCheckInBookingId] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setLoadError('Your session is unavailable. Please sign in again.');
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const [resourceList, myBookings, recurring, notifs] = await Promise.all([
        listResources(accessToken),
        listMyBookings(accessToken),
        listMyRecurringBookings(accessToken),
        listBookingNotifications(accessToken),
      ]);
      setResources(resourceList);
      setBookings(myBookings);
      setRecurringBookings(recurring);
      setNotifications(notifs);
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

  // Handlers
  async function handleCreateBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    if (!form.resourceId) {
      showToast('warning', 'Resource required', 'Select a resource.');
      return;
    }

    const startTimeIso = localDateTimeToIso(form.startTime);
    const endTimeIso = localDateTimeToIso(form.endTime);

    if (!startTimeIso || !endTimeIso) {
      showToast('warning', 'Invalid time', 'Enter valid times.');
      return;
    }

    if (new Date(startTimeIso).getTime() >= new Date(endTimeIso).getTime()) {
      showToast('warning', 'Invalid range', 'Start time must be before end time.');
      return;
    }

    setSubmitting(true);
    try {
      await createBooking(accessToken, {
        resourceId: form.resourceId as any,
        startTime: startTimeIso,
        endTime: endTimeIso,
        purpose: form.purpose,
      });
      showToast('success', 'Booking created', 'Your booking request has been submitted.');
      setForm(NEW_BOOKING_INITIAL);
      await reload();
    } catch (error) {
      showToast('error', 'Booking failed', getErrorMessage(error, 'Could not create booking.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelBooking(bookingId: string) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    if (!confirm('Cancel this booking?')) return;

    setSubmitting(true);
    try {
      await cancelMyBooking(accessToken, bookingId);
      showToast('success', 'Booking cancelled', 'Your booking has been cancelled.');
      await reload();
    } catch (error) {
      showToast('error', 'Cancellation failed', getErrorMessage(error, 'Could not cancel booking.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateRecurringBooking(data: any) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    setSubmitting(true);
    try {
      await createRecurringBooking(accessToken, data);
      showToast('success', 'Recurring booking created', 'Your recurring bookings have been created.');
      setShowRecurringForm(false);
      await reload();
    } catch (error) {
      showToast('error', 'Failed', getErrorMessage(error, 'Could not create recurring booking.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestModification(data: any) {
    if (!accessToken || !modificationBooking) return;

    setSubmitting(true);
    try {
      await requestBookingModification(accessToken, modificationBooking.id, data);
      showToast('success', 'Modification requested', 'Your reschedule request has been submitted.');
      setShowModificationModal(false);
      await reload();
    } catch (error) {
      showToast('error', 'Request failed', getErrorMessage(error, 'Could not request modification.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckIn(bookingId: string) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    setSubmitting(true);
    try {
      await checkInBooking(accessToken, bookingId);
      showToast('success', 'Checked in', 'You have checked in to your booking.');
      setCheckInBookingId(null);
      await reload();
    } catch (error) {
      showToast('error', 'Check-in failed', getErrorMessage(error, 'Could not check in.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkNotificationAsRead(notificationId: string) {
    try {
      await markNotificationAsRead(notificationId);
      await reload();
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  }

  const selectedCheckInBooking = bookings.find((b) => b.id === checkInBookingId);

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      {/* Header */}
      <div>
        <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {workspaceLabel}
        </p>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, lineHeight: 1.1, color: 'var(--text-h)' }}>
          Bookings
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
          Manage your resource bookings and recurring schedules.
        </p>
      </div>


      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)' }}>
        {(['bookings', 'recurring', 'calendar', 'notifications'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === tab ? 600 : 500,
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'bookings' && 'My Bookings'}
            {tab === 'recurring' && 'Recurring'}
            {tab === 'calendar' && 'Calendar'}
            {tab === 'notifications' && (
              <>
                Notifications
                {notifications.filter((n) => !n.readAt).length > 0 && (
                  <span style={{ marginLeft: 6, backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                    {notifications.filter((n) => !n.readAt).length}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <Alert variant="info" title="Loading">
          Please wait while we load your bookings...
        </Alert>
      ) : loadError ? (
        <Alert variant="error" title="Error">
          {loadError}
        </Alert>
      ) : (
        <>
          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div style={{ display: 'grid', gap: 16 }}>
              {/* Create New Booking Form */}
              <Card style={{ padding: 20 }}>
                <form onSubmit={handleCreateBooking} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Resource</label>
                    <Select
                      value={form.resourceId}
                      onChange={(e) => setForm({ ...form, resourceId: e.target.value })}
                      options={[
                        { value: '', label: 'Select resource' },
                        ...resources.map((r) => ({ value: r.id, label: r.code })),
                      ]}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Start</label>
                    <Input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>End</label>
                    <Input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Purpose</label>
                    <Input placeholder="Optional" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <Button type="submit" disabled={submitting} style={{ flex: 1 }}>
                      {submitting ? 'Creating...' : 'Book Now'}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Bookings List */}
              {bookings.length === 0 ? (
                <Alert variant="info" title="No bookings">
                  You haven't created any bookings yet.
                </Alert>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Resource</TableCell>
                        <TableCell>Start Time</TableCell>
                        <TableCell>End Time</TableCell>
                        <TableCell>Purpose</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <strong>{booking.resource.code}</strong>
                            <br />
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{booking.resource.name}</span>
                          </TableCell>
                          <TableCell style={{ fontSize: 12 }}>{formatDateTime(booking.startTime)}</TableCell>
                          <TableCell style={{ fontSize: 12 }}>{formatDateTime(booking.endTime)}</TableCell>
                          <TableCell style={{ fontSize: 12 }}>{booking.purpose || '—'}</TableCell>
                          <TableCell>
                            <Chip color={statusChipColor(booking.status)}>{booking.status}</Chip>
                          </TableCell>
                          <TableCell>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {booking.status === 'APPROVED' && new Date(booking.startTime).getTime() > Date.now() && (
                                <Button variant="ghost" onClick={() => { setModificationBooking(booking); setShowModificationModal(true); }} style={{ fontSize: 11 }}>
                                  Reschedule
                                </Button>
                              )}
                              {canCancelByRequester(booking) && (
                                <Button variant="ghost-danger" onClick={() => handleCancelBooking(booking.id)} disabled={submitting} style={{ fontSize: 11 }}>
                                  Cancel
                                </Button>
                              )}
                              {booking.status === 'APPROVED' && new Date(booking.startTime).getTime() <= Date.now() && new Date(booking.endTime).getTime() > Date.now() && (
                                <Button variant="primary" onClick={() => setCheckInBookingId(booking.id)} style={{ fontSize: 11 }}>
                                  Check In
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* Recurring Tab */}
          {activeTab === 'recurring' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <Button onClick={() => setShowRecurringForm(!showRecurringForm)} variant="primary">
                <Plus size={16} style={{ marginRight: 6 }} />
                Create Recurring Booking
              </Button>

              {showRecurringForm && (
                <RecurringBookingForm
                  resources={resources}
                  onSubmit={handleCreateRecurringBooking}
                  onCancel={() => setShowRecurringForm(false)}
                  isLoading={submitting}
                />
              )}

              {recurringBookings.length === 0 ? (
                <Alert variant="info" title="No recurring bookings">
                  You haven't created any recurring bookings yet.
                </Alert>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {recurringBookings.map((recurring) => (
                    <Card key={recurring.id} style={{ padding: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 6 }}>
                            {recurring.resource.name} - {recurring.recurrencePattern}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'grid', gap: 4 }}>
                            <div>📅 Starts: {new Date(recurring.startDate).toLocaleDateString('en-LK')}</div>
                            <div>⏰ {recurring.startTime} - {recurring.endTime}</div>
                            {recurring.endDate && <div>Ends: {new Date(recurring.endDate).toLocaleDateString('en-LK')}</div>}
                            {recurring.occurrenceCount && <div>Occurrences: {recurring.occurrenceCount}</div>}
                            <Chip color={recurring.active ? 'green' : 'red'}>{recurring.active ? 'Active' : 'Inactive'}</Chip>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && <BookingCalendar bookings={bookings} />}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <NotificationCenter
              notifications={notifications}
              onMarkAsRead={handleMarkNotificationAsRead}
              isLoading={submitting}
            />
          )}
        </>
      )}

      {/* Modification Modal */}
      <BookingModificationModal
        booking={modificationBooking}
        isOpen={showModificationModal}
        onClose={() => { setShowModificationModal(false); setModificationBooking(null); }}
        onSubmit={handleRequestModification}
        isLoading={submitting}
      />

      {/* Check-in Dialog */}
      {selectedCheckInBooking && (
        <Dialog open={!!checkInBookingId} onClose={() => setCheckInBookingId(null)} title="Check In to Booking">
          <BookingCheckInPanel
            booking={selectedCheckInBooking}
            onCheckIn={() => handleCheckIn(selectedCheckInBooking.id)}
            isLoading={submitting}
          />
        </Dialog>
      )}
    </div>
  );
}
