'use client';

import React from 'react';
import { CalendarDays, Plus, Search } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import {
  Alert,
  Button,
  Card,
  Chip,
  Dialog,
  Input,
  Select,
  Skeleton,
  Tabs,
  Textarea,
} from '@/components/ui';
import {
  BookingCard,
  BookingCardSkeleton,
  BookingSection,
} from '@/components/booking/BookingCard';
import { RecurringBookingForm } from '@/components/booking/RecurringBookingForm';
import { BookingModificationModal } from '@/components/booking/BookingModificationModal';
import { BookingCheckInPanel } from '@/components/booking/BookingCheckInPanel';
import { BookingCalendar } from '@/components/booking/BookingCalendar';
import {
  cancelMyBooking,
  checkInBooking,
  createBooking,
  createRecurringBooking,
  getErrorMessage,
  getResourceRemainingRanges,
  listMyBookings,
  listMyRecurringBookings,
  listNotifications,
  listResourceOptions,
  requestBookingModification,
} from '@/lib/api-client';
import type {
  BookingResponse,
  BookingStatus,
  CreateRecurringBookingRequest,
  NotificationResponse,
  RecurringBookingResponse,
  RequestModificationRequest,
  ResourceRemainingRangesResponse,
  ResourceOption,
} from '@/lib/api-types';
import { getResourceCategoryLabel } from '@/lib/resource-display';

type TabType = 'bookings' | 'recurring' | 'calendar';

const DURATION_HINTS: Record<string, string> = {
  SPACES: 'Max 3 hours',
  LECTURE_HALL: 'Max 3 hours',
  LABORATORY: 'Max 3 hours',
  LIBRARY_SPACE: 'Max 3 hours',
  MEETING_ROOM: 'Max 3 hours',
  EVENT_SPACE: 'Max 3 hours',
};

const NEW_BOOKING_INITIAL = {
  category: '',
  subcategory: '',
  resourceId: '',
  startTime: '',
  endTime: '',
  purpose: '',
};

const BOOKING_SECTIONS: Array<{ status: BookingStatus; label: string; color: string }> = [
  { status: 'APPROVED', label: 'Approved', color: 'var(--green-400)' },
  { status: 'PENDING', label: 'Pending Review', color: 'var(--yellow-400)' },
  { status: 'CHECKED_IN', label: 'Checked In', color: 'var(--blue-400)' },
  { status: 'COMPLETED', label: 'Completed', color: 'var(--blue-500)' },
  { status: 'REJECTED', label: 'Rejected', color: 'var(--red-400)' },
  { status: 'CANCELLED', label: 'Cancelled', color: 'var(--neutral-400)' },
  { status: 'NO_SHOW', label: 'No Show', color: 'var(--red-500)' },
];

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

function getIsoDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function localDateTimeToIso(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeSubcategory(value: string | null) {
  if (!value) {
    return '';
  }

  return value.trim().replace(/[\s-]+/g, '_').toUpperCase();
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

function isSpaceResource(resource?: ResourceOption | null) {
  return resource?.category === 'SPACES';
}

function isCheckInAvailable(booking: BookingResponse, resource?: ResourceOption | null) {
  if (!isSpaceResource(resource)) {
    return false;
  }

  if (booking.status !== 'APPROVED') {
    return false;
  }

  const now = Date.now();
  const startTime = new Date(booking.startTime).getTime();
  const endTime = new Date(booking.endTime).getTime();

  return startTime <= now && endTime > now;
}

function RecurringBookingCard({ recurring }: { recurring: RecurringBookingResponse }) {
  return (
    <Card
      style={{
        minWidth: 320,
        maxWidth: 340,
        padding: 18,
        border: '1px solid var(--border)',
        boxShadow: 'var(--card-shadow)',
        display: 'grid',
        gap: 12,
        background: 'var(--surface)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 6,
            }}
          >
            {recurring.resource.code}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h)' }}>{recurring.resource.name}</div>
        </div>
        <Chip color={recurring.active ? 'green' : 'red'} size="sm" dot>
          {recurring.active ? 'Active' : 'Inactive'}
        </Chip>
      </div>

      <div style={{ display: 'grid', gap: 7, fontSize: 11.5, color: 'var(--text-body)' }}>
        <div>{recurring.recurrencePattern}</div>
        <div>Starts: {new Date(recurring.startDate).toLocaleDateString('en-LK')}</div>
        <div>
          Time: {recurring.startTime} to {recurring.endTime}
        </div>
        {recurring.endDate && <div>Ends: {new Date(recurring.endDate).toLocaleDateString('en-LK')}</div>}
        {recurring.occurrenceCount && <div>Occurrences: {recurring.occurrenceCount}</div>}
        {recurring.purpose && <div>{recurring.purpose}</div>}
      </div>
    </Card>
  );
}

function RequesterBookingSectionsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <BookingSection
          key={sectionIndex}
          label="Loading"
          color="var(--border)"
          count={3}
        >
          {Array.from({ length: 3 }).map((__, cardIndex) => (
            <div key={cardIndex} style={{ flexShrink: 0 }}>
              <BookingCardSkeleton />
            </div>
          ))}
        </BookingSection>
      ))}
    </div>
  );
}

export function RequesterBookingsScreenEnhanced({
  workspaceLabel,
}: {
  workspaceLabel: 'Student Workspace' | 'Faculty Workspace';
}) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.access_token ?? null;

  const [resources, setResources] = React.useState<ResourceOption[]>([]);
  const [bookings, setBookings] = React.useState<BookingResponse[]>([]);
  const [recurringBookings, setRecurringBookings] = React.useState<RecurringBookingResponse[]>([]);
  const [notifications, setNotifications] = React.useState<NotificationResponse[]>([]);
  const [form, setForm] = React.useState(NEW_BOOKING_INITIAL);
  const [searchText, setSearchText] = React.useState('');
  const deferredSearch = React.useDeferredValue(searchText);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabType>('bookings');
  const [showBookingComposer, setShowBookingComposer] = React.useState(true);
  const [showRecurringForm, setShowRecurringForm] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [remainingRanges, setRemainingRanges] = React.useState<ResourceRemainingRangesResponse | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = React.useState(false);
  const [availabilityError, setAvailabilityError] = React.useState<string | null>(null);
  const [showModificationModal, setShowModificationModal] = React.useState(false);
  const [modificationBooking, setModificationBooking] = React.useState<BookingResponse | null>(null);
  const [checkInBookingId, setCheckInBookingId] = React.useState<string | null>(null);
  const [cancellationBooking, setCancellationBooking] = React.useState<BookingResponse | null>(null);
  const [locationBooking, setLocationBooking] = React.useState<BookingResponse | null>(null);
  const [cancellationReason, setCancellationReason] = React.useState('');

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
        listResourceOptions(accessToken, { status: 'ACTIVE', bookable: true }),
        listMyBookings(accessToken),
        listMyRecurringBookings(accessToken),
        listNotifications(accessToken, { domain: 'BOOKING', limit: 40 }),
      ]);

      setResources(resourceList);
      setBookings(myBookings);
      setRecurringBookings(recurring);
      setNotifications(notifs);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load your bookings.'));
      setResources([]);
      setBookings([]);
      setRecurringBookings([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    async function loadRemainingRanges() {
      if (!accessToken || !form.resourceId) {
        setRemainingRanges(null);
        setAvailabilityError(null);
        return;
      }

      const date = getIsoDate(form.startTime) ?? new Date().toISOString().slice(0, 10);

      setAvailabilityLoading(true);
      setAvailabilityError(null);
      try {
        const response = await getResourceRemainingRanges(accessToken, form.resourceId, date);
        setRemainingRanges(response);
      } catch (error) {
        setRemainingRanges(null);
        setAvailabilityError(getErrorMessage(error, 'Could not load remaining ranges.'));
      } finally {
        setAvailabilityLoading(false);
      }
    }

    void loadRemainingRanges();
  }, [accessToken, form.resourceId, form.startTime]);

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
      showToast('warning', 'Invalid time', 'Enter valid start and end times.');
      return;
    }

    if (new Date(startTimeIso).getTime() >= new Date(endTimeIso).getTime()) {
      showToast('warning', 'Invalid range', 'Start time must be before end time.');
      return;
    }

    setSubmitting(true);
    try {
      await createBooking(accessToken, {
        resourceId: form.resourceId,
        startTime: startTimeIso,
        endTime: endTimeIso,
        purpose: form.purpose,
      });
      showToast('success', 'Booking created', 'Your booking request has been submitted.');
      setForm(NEW_BOOKING_INITIAL);
      setShowBookingComposer(false);
      setActiveTab('bookings');
      await reload();
    } catch (error) {
      showToast('error', 'Booking failed', getErrorMessage(error, 'Could not create booking.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateRecurringBooking(data: CreateRecurringBookingRequest) {
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

  async function handleRequestModification(data: RequestModificationRequest) {
    if (!accessToken || !modificationBooking) {
      return;
    }

    setSubmitting(true);
    try {
      await requestBookingModification(accessToken, modificationBooking.id, data);
      showToast('success', 'Modification requested', 'Your reschedule request has been submitted.');
      setShowModificationModal(false);
      setModificationBooking(null);
      await reload();
    } catch (error) {
      showToast('error', 'Request failed', getErrorMessage(error, 'Could not request modification.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmCancellation() {
    if (!accessToken || !cancellationBooking) {
      return;
    }

    setSubmitting(true);
    try {
      const reason = cancellationReason.trim();
      await cancelMyBooking(accessToken, cancellationBooking.id, reason ? { reason } : undefined);
      showToast('success', 'Booking cancelled', 'Your booking has been cancelled.');
      setCancellationBooking(null);
      setCancellationReason('');
      await reload();
    } catch (error) {
      showToast('error', 'Cancellation failed', getErrorMessage(error, 'Could not cancel booking.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckIn(bookingId: string) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    const booking = bookings.find((entry) => entry.id === bookingId);
    const resource = booking ? resourceById.get(booking.resource.id) : null;
    if (!isSpaceResource(resource)) {
      showToast('warning', 'Check-in unavailable', 'Check-in is only available for space bookings.');
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

  const resourceById = React.useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource])),
    [resources],
  );

  const selectedCheckInBooking = bookings.find((booking) => booking.id === checkInBookingId) ?? null;
  const selectedLocationResource = locationBooking ? resourceById.get(locationBooking.resource.id) ?? null : null;
  const selectedLocationName = selectedLocationResource?.locationName ?? null;

  const bookableResources = React.useMemo(
    () => resources.filter((resource) => resource.status === 'ACTIVE' && resource.bookable),
    [resources],
  );

  const categoryOptions = React.useMemo(
    () => Array.from(new Set(bookableResources.map((resource) => resource.category)))
      .sort()
      .map((category) => ({ value: category, label: getResourceCategoryLabel(category) })),
    [bookableResources],
  );

  const categoryFilteredResources = React.useMemo(
    () => form.category
      ? bookableResources.filter((resource) => resource.category === form.category)
      : [],
    [bookableResources, form.category],
  );

  const subcategoryOptions = React.useMemo(
    () => (form.category
      ? Array.from(
          new Set(
            categoryFilteredResources
              .map((resource) => resource.subcategory)
              .filter((subcategory): subcategory is string => Boolean(subcategory && subcategory.trim())),
          ),
        )
      : [])
        .sort((left, right) => left.localeCompare(right))
        .map((subcategory) => ({ value: subcategory, label: subcategory })),
    [categoryFilteredResources, form.category],
  );

  const filteredResources = React.useMemo(
    () => form.subcategory
      ? categoryFilteredResources.filter(
          (resource) => normalizeSubcategory(resource.subcategory) === normalizeSubcategory(form.subcategory),
        )
      : categoryFilteredResources,
    [categoryFilteredResources, form.subcategory],
  );

  const selectedSubcategoryHint = DURATION_HINTS[normalizeSubcategory(form.subcategory)] ?? null;

  const filteredBookings = React.useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    if (!needle) {
      return bookings;
    }

    return bookings.filter((booking) => {
      const resource = resourceById.get(booking.resource.id);
      return (
        booking.resource.code.toLowerCase().includes(needle)
        || booking.resource.name.toLowerCase().includes(needle)
        || (booking.purpose ?? '').toLowerCase().includes(needle)
        || (resource?.locationName ?? '').toLowerCase().includes(needle)
      );
    });
  }, [bookings, deferredSearch, resourceById]);

  const groupedBookings = React.useMemo(
    () => BOOKING_SECTIONS.map((section) => ({
      ...section,
      items: filteredBookings.filter((booking) => booking.status === section.status),
    })).filter((section) => section.items.length > 0),
    [filteredBookings],
  );

  const pendingCount = bookings.filter((booking) => booking.status === 'PENDING').length;
  const approvedCount = bookings.filter((booking) => booking.status === 'APPROVED').length;
  const recurringCount = recurringBookings.filter((booking) => booking.active).length;
  const unreadNotificationCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0, width: '100%', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
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
            Bookings
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Plan bookings, track approvals, and keep an eye on recurring schedules and reminders.
          </p>
        </div>

        <Button
          iconLeft={<Plus size={14} />}
          onClick={() => {
            setActiveTab('bookings');
            setShowBookingComposer((current) => !current);
          }}
          style={{ flexShrink: 0, marginTop: 8 }}
        >
          {showBookingComposer ? 'Hide Composer' : 'New Booking'}
        </Button>
      </div>

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
        <Card>
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Recurring
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-h)' }}>
            {recurringCount}
          </p>
        </Card>
        <Card>
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Notifications
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: unreadNotificationCount > 0 ? 'var(--blue-600)' : 'var(--text-h)' }}>
            {unreadNotificationCount}
          </p>
        </Card>
      </div>

      <Tabs
        variant="pill"
        tabs={[
          { label: 'My Bookings', value: 'bookings', badge: bookings.length },
          { label: 'Recurring', value: 'recurring', badge: recurringBookings.length },
          { label: 'Calendar', value: 'calendar' },
        ]}
        value={activeTab}
        onChange={(value) => setActiveTab(value as TabType)}
      />

      {loadError && (
        <Alert variant="error" title="Load failed">
          {loadError}
        </Alert>
      )}

      {loading ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <Card style={{ padding: 20 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <Skeleton variant="line" height={16} width="34%" />
                <Skeleton variant="rect" height={44} />
                <Skeleton variant="rect" height={44} />
                <Skeleton variant="rect" height={44} />
              </div>
            </Card>
            <Card style={{ padding: 20 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <Skeleton variant="line" height={16} width="48%" />
                <Skeleton variant="line" height={12} width="80%" />
                <Skeleton variant="rect" height={32} />
                <Skeleton variant="rect" height={32} />
              </div>
            </Card>
          </div>
          <RequesterBookingSectionsSkeleton />
        </>
      ) : (
        <>
          {activeTab === 'bookings' && (
            <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(300px, 0.95fr)', gap: 16, minWidth: 0 }}>
                <Card style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                        Booking Composer
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                        Build a booking request with live catalogue options and availability feedback.
                      </div>
                    </div>
                    <Chip color={showBookingComposer ? 'blue' : 'neutral'} size="sm">
                      {showBookingComposer ? 'Expanded' : 'Collapsed'}
                    </Chip>
                  </div>

                  {showBookingComposer ? (
                    <form onSubmit={handleCreateBooking} style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                        <Select
                          id="requester-booking-category"
                          label="Category"
                          value={form.category}
                          onChange={(event) => setForm((current) => ({
                            ...current,
                            category: event.target.value,
                            subcategory: '',
                            resourceId: '',
                          }))}
                          options={[{ value: '', label: 'Select category' }, ...categoryOptions]}
                        />
                        <Select
                          id="requester-booking-subcategory"
                          label="Subcategory"
                          value={form.subcategory}
                          onChange={(event) => setForm((current) => ({
                            ...current,
                            subcategory: event.target.value,
                            resourceId: '',
                          }))}
                          options={[{ value: '', label: 'Select subcategory' }, ...subcategoryOptions]}
                        />
                        <Select
                          id="requester-booking-resource"
                          label="Resource"
                          value={form.resourceId}
                          onChange={(event) => setForm((current) => ({ ...current, resourceId: event.target.value }))}
                          options={[
                            { value: '', label: 'Select resource' },
                            ...filteredResources.map((resource) => ({
                              value: resource.id,
                              label: resource.name,
                            })),
                          ]}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                        <Input
                          id="requester-booking-start"
                          label="Start"
                          type="datetime-local"
                          value={form.startTime}
                          onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                        />
                        <Input
                          id="requester-booking-end"
                          label="End"
                          type="datetime-local"
                          value={form.endTime}
                          onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                        />
                        <Input
                          id="requester-booking-purpose"
                          label="Purpose"
                          placeholder="Optional"
                          value={form.purpose}
                          onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}
                        />
                      </div>

                      {selectedSubcategoryHint && (
                        <Alert variant="info" title="Duration Guidance">
                          {selectedSubcategoryHint}
                        </Alert>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setForm(NEW_BOOKING_INITIAL);
                            setRemainingRanges(null);
                            setAvailabilityError(null);
                          }}
                          disabled={submitting}
                        >
                          Reset
                        </Button>
                        <Button type="submit" loading={submitting}>
                          Submit Booking
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Alert variant="info" title="Composer hidden">
                      Use the New Booking button to open the booking request composer.
                    </Alert>
                  )}
                </Card>

                <Card style={{ padding: 20, minWidth: 0 }}>
                  <div style={{ display: 'grid', gap: 14 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                        Availability Snapshot
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                        Remaining booking windows for the selected resource and day.
                      </div>
                    </div>

                    {!form.resourceId && (
                      <Alert variant="info" title="Resource required">
                        Select a resource to load its available time ranges.
                      </Alert>
                    )}

                    {availabilityLoading && <Skeleton variant="line" height={12} width="44%" />}

                    {availabilityError && (
                      <Alert variant="error" title="Availability unavailable">
                        {availabilityError}
                      </Alert>
                    )}

                    {remainingRanges && !availabilityLoading && !availabilityError && (
                      remainingRanges.remainingRanges.length === 0 ? (
                        <Alert variant="warning" title="No remaining slots">
                          No remaining ranges were found for the selected date.
                        </Alert>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {remainingRanges.remainingRanges.map((range, index) => (
                            <Chip key={`${range.startTime}-${range.endTime}-${index}`} color="blue">
                              {formatDateTime(range.startTime)} - {formatDateTime(range.endTime)}
                            </Chip>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </Card>
              </div>

              <Card style={{ padding: 18, minWidth: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'end', minWidth: 0 }}>
                  <Input
                    id="requester-booking-search"
                    label="Search bookings"
                    placeholder="Search resource, code, purpose, or location"
                    value={searchText}
                    iconLeft={<Search size={14} />}
                    onChange={(event) => setSearchText(event.target.value)}
                  />
                  <Button variant="subtle" onClick={() => setSearchText('')}>
                    Clear Search
                  </Button>
                </div>
              </Card>

              {bookings.length === 0 ? (
                <Alert variant="info" title="No bookings">
                  You have not created any bookings yet.
                </Alert>
              ) : groupedBookings.length === 0 ? (
                <Alert variant="info" title="No matches">
                  No bookings match the current search text.
                </Alert>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32, minWidth: 0 }}>
                  {groupedBookings.map((section) => (
                    <BookingSection
                      key={section.status}
                      label={section.label}
                      color={section.color}
                      count={section.items.length}
                    >
                      {section.items.map((booking) => {
                        const resource = resourceById.get(booking.resource.id);

                        return (
                          <div key={booking.id} style={{ minWidth: 320, maxWidth: 340, flexShrink: 0 }}>
                            <BookingCard
                              booking={booking}
                              resource={resource}
                              onLocation={() => setLocationBooking(booking)}
                              actions={
                                <>
                                  {booking.status === 'APPROVED' && new Date(booking.startTime).getTime() > Date.now() && (
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      onClick={() => {
                                        setModificationBooking(booking);
                                        setShowModificationModal(true);
                                      }}
                                    >
                                      Reschedule
                                    </Button>
                                  )}
                                  {canCancelByRequester(booking) && (
                                    <Button
                                      variant="ghost-danger"
                                      size="xs"
                                      onClick={() => {
                                        setCancellationBooking(booking);
                                        setCancellationReason('');
                                      }}
                                      disabled={submitting}
                                    >
                                      Cancel
                                    </Button>
                                  )}
                                  {isCheckInAvailable(booking, resource) && (
                                    <Button
                                      variant="primary"
                                      size="xs"
                                      onClick={() => setCheckInBookingId(booking.id)}
                                    >
                                      Check In
                                    </Button>
                                  )}
                                </>
                              }
                            />
                          </div>
                        );
                      })}
                    </BookingSection>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'recurring' && (
            <div style={{ display: 'grid', gap: 18, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                    Recurring Bookings
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                    Create repeating booking schedules using the same resource catalogue.
                  </div>
                </div>
                <Button
                  iconLeft={<CalendarDays size={14} />}
                  onClick={() => setShowRecurringForm((current) => !current)}
                >
                  {showRecurringForm ? 'Hide Form' : 'Create Recurring Booking'}
                </Button>
              </div>

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
                  You have not created any recurring bookings yet.
                </Alert>
              ) : (
                <BookingSection label="Recurring Schedule" color="var(--blue-400)" count={recurringBookings.length}>
                  {recurringBookings.map((recurring) => (
                    <div key={recurring.id} style={{ flexShrink: 0 }}>
                      <RecurringBookingCard recurring={recurring} />
                    </div>
                  ))}
                </BookingSection>
              )}
            </div>
          )}

          {activeTab === 'calendar' && <BookingCalendar bookings={bookings} />}
        </>
      )}

      <BookingModificationModal
        booking={modificationBooking}
        isOpen={showModificationModal}
        onClose={() => {
          setShowModificationModal(false);
          setModificationBooking(null);
        }}
        onSubmit={handleRequestModification}
        isLoading={submitting}
      />

      {selectedCheckInBooking && (
        <Dialog
          open={!!checkInBookingId}
          onClose={() => setCheckInBookingId(null)}
          title="Check In to Booking"
        >
          <BookingCheckInPanel
            booking={selectedCheckInBooking}
            onCheckIn={() => handleCheckIn(selectedCheckInBooking.id)}
            isLoading={submitting}
          />
        </Dialog>
      )}

      <Dialog
        open={!!locationBooking}
        onClose={() => setLocationBooking(null)}
        title="Location Details"
        size="sm"
      >
        <div style={{ padding: '20px 24px', display: 'grid', gap: 16 }}>
          <div
            style={{
              display: 'grid',
              gap: 6,
              padding: 16,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
              background: 'color-mix(in srgb, var(--bg-card) 94%, #eef4ff 6%)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              Resource
            </span>
            <strong style={{ color: 'var(--text-h)', fontSize: 16 }}>
              {locationBooking?.resource.name ?? 'Selected booking'}
            </strong>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              {selectedLocationResource?.code ?? locationBooking?.resource.code ?? 'N/A'}
            </span>
          </div>

          {selectedLocationResource ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.12em' }}>
                    Location
                  </span>
                  <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>
                    {selectedLocationName ?? 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.12em' }}>
                    Type
                  </span>
                  <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>
                    N/A
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.12em' }}>
                    Building
                  </span>
                  <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>
                    N/A
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.12em' }}>
                    Wing
                  </span>
                  <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>
                    N/A
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.12em' }}>
                    Floor
                  </span>
                  <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>
                    N/A
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.12em' }}>
                    Room Code
                  </span>
                  <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>
                    N/A
                  </span>
                </div>
              </div>

              <Alert variant="info" title="Booking integration">
                Location details are resolved from the linked resource record for this booking.
              </Alert>
            </>
          ) : (
            <Alert variant="warning" title="Location unavailable">
              We could not resolve the linked resource details for this booking right now.
            </Alert>
          )}
        </div>
      </Dialog>

      {cancellationBooking && (
        <Dialog
          open={!!cancellationBooking}
          onClose={() => {
            if (submitting) {
              return;
            }

            setCancellationBooking(null);
            setCancellationReason('');
          }}
          title="Cancel Booking"
          size="sm"
        >
          <div style={{ padding: '20px 24px', display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body)' }}>
              Are you sure you want to cancel booking for{' '}
              <strong style={{ color: 'var(--text-h)' }}>{cancellationBooking.resource.name}</strong>?
            </p>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Cancellation reason (optional)
              </label>
              <Textarea
                value={cancellationReason}
                onChange={(event) => setCancellationReason(event.target.value)}
                rows={3}
                placeholder="Add context for managers if needed"
                disabled={submitting}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                variant="ghost"
                onClick={() => {
                  setCancellationBooking(null);
                  setCancellationReason('');
                }}
                disabled={submitting}
              >
                Keep Booking
              </Button>
              <Button variant="danger" onClick={handleConfirmCancellation} loading={submitting}>
                Confirm Cancel
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
