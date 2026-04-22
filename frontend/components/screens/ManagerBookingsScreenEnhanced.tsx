'use client';

import React from 'react';
import { Check, Search, X } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert, Button, Card, Chip, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, Textarea } from '@/components/ui';
import {
  approveBooking,
  approveModification,
  cancelApprovedBookingAsManager,
  completeBooking,
  getErrorMessage,
  listAllBookings,
  listPendingModifications,
  listResources,
  markBookingAsNoShow,
  rejectBooking,
  rejectModification,
} from '@/lib/api-client';
import type { BookingResponse, BookingStatus, ResourceResponse, BookingModificationResponse } from '@/lib/api-types';
import { getResourceCategoryLabel } from '@/lib/resource-display';
import { BookingScreenSkeleton } from '@/components/booking/BookingScreenSkeleton';

type TabType = 'bookings' | 'modifications' | 'checkins';

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

function shortId(value: string) {
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

function normalizeSubcategory(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return value.trim().replace(/[\s-]+/g, '_').toUpperCase();
}

export function ManagerBookingsScreenEnhanced() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.access_token ?? null;

  const [bookings, setBookings] = React.useState<BookingResponse[]>([]);
  const [modifications, setModifications] = React.useState<BookingModificationResponse[]>([]);
  const [resources, setResources] = React.useState<ResourceResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [activeBookingId, setActiveBookingId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<TabType>('bookings');

  const [statusFilter, setStatusFilter] = React.useState<BookingStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [subcategoryFilter, setSubcategoryFilter] = React.useState('');
  const [resourceFilter, setResourceFilter] = React.useState('');
  const [searchText, setSearchText] = React.useState('');
  const deferredSearch = React.useDeferredValue(searchText);

  // Modification approval modals
  const [showModificationDetail, setShowModificationDetail] = React.useState(false);
  const [selectedModification, setSelectedModification] = React.useState<BookingModificationResponse | null>(null);
  const [decisionReason, setDecisionReason] = React.useState('');

  const reload = React.useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setLoadError('The manager session is unavailable. Please sign in again.');
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const [allBookings, pendingMods, availableResources] = await Promise.all([
        listAllBookings(accessToken),
        listPendingModifications(accessToken),
        listResources(accessToken),
      ]);
      setBookings(allBookings);
      setModifications(pendingMods);
      setResources(availableResources);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load bookings.'));
      setBookings([]);
      setModifications([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const resourceById = React.useMemo(
    () =>
      new Map(resources.map((resource) => [resource.id, resource])),
    [resources],
  );

  const categoryOptions = React.useMemo(
    () =>
      Array.from(new Set(resources.map((resource) => resource.category)))
        .sort()
        .map((category) => ({
          value: category,
          label: getResourceCategoryLabel(category),
        })),
    [resources],
  );

  const categoryFilteredResources = React.useMemo(
    () =>
      categoryFilter
        ? resources.filter((resource) => resource.category === categoryFilter)
        : resources,
    [categoryFilter, resources],
  );

  const subcategoryOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          categoryFilteredResources
            .map((resource) => resource.subcategory)
            .filter((subcategory): subcategory is string => Boolean(subcategory && subcategory.trim())),
        ),
      )
        .sort((left, right) => left.localeCompare(right))
        .map((subcategory) => ({
          value: subcategory,
          label: subcategory,
        })),
    [categoryFilteredResources],
  );

  const resourceOptions = React.useMemo(
    () =>
      categoryFilteredResources
        .filter(
          (resource) => !subcategoryFilter
            || normalizeSubcategory(resource.subcategory) === normalizeSubcategory(subcategoryFilter),
        )
        .map((resource) => ({
          value: resource.id,
          label: resource.name,
        })),
    [categoryFilteredResources, subcategoryFilter],
  );

  const filteredBookings = React.useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();

    return bookings.filter((booking) => {
      const resource = resourceById.get(booking.resource.id);

      if (statusFilter && booking.status !== statusFilter) {
        return false;
      }

      if (categoryFilter && resource?.category !== categoryFilter) {
        return false;
      }

      if (
        subcategoryFilter
        && normalizeSubcategory(resource?.subcategory) !== normalizeSubcategory(subcategoryFilter)
      ) {
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
        || (booking.requesterRegistrationNumber ?? '').toLowerCase().includes(needle)
        || booking.requesterId.toLowerCase().includes(needle)
      );
    });
  }, [bookings, categoryFilter, deferredSearch, resourceById, resourceFilter, statusFilter, subcategoryFilter]);

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING').length;
  const approvedBookings = bookings.filter((b) => b.status === 'APPROVED').length;
  const pendingModifications = modifications.filter((m) => m.status === 'PENDING').length;
  const rejectedBookings = bookings.filter((b) => b.status === 'REJECTED').length;

  // Booking approval handlers
  async function handleApproveBooking(booking: BookingResponse) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    setActiveBookingId(booking.id);
    try {
      await approveBooking(accessToken, booking.id);
      await reload();
      showToast('success', 'Booking approved', `${booking.resource.name} has been approved.`);
    } catch (error) {
      showToast('error', 'Approval failed', getErrorMessage(error, 'Could not approve this booking.'));
    } finally {
      setActiveBookingId(null);
    }
  }

  async function handleRejectBooking(booking: BookingResponse) {
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
      showToast('success', 'Booking rejected', `${booking.resource.name} was rejected.`);
    } catch (error) {
      showToast('error', 'Rejection failed', getErrorMessage(error, 'Could not reject this booking.'));
    } finally {
      setActiveBookingId(null);
    }
  }

  async function handleCancelApprovedBooking(booking: BookingResponse) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    const confirmed = window.confirm(`Cancel approved booking ${booking.resource.name}?`);
    if (!confirmed) {
      return;
    }

    const reason = window.prompt('Optional cancellation reason:')?.trim();

    setActiveBookingId(booking.id);
    try {
      await cancelApprovedBookingAsManager(accessToken, booking.id, reason ? { reason } : undefined);
      await reload();
      showToast('success', 'Booking cancelled', `${booking.resource.name} was cancelled.`);
    } catch (error) {
      showToast('error', 'Cancellation failed', getErrorMessage(error, 'Could not cancel this booking.'));
    } finally {
      setActiveBookingId(null);
    }
  }

  // Modification handlers
  async function handleApproveModification(modification: BookingModificationResponse) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    setActiveBookingId(modification.id);
    try {
      await approveModification(accessToken, modification.id);
      await reload();
      setShowModificationDetail(false);
      setSelectedModification(null);
      showToast('success', 'Modification approved', 'The reschedule request has been approved.');
    } catch (error) {
      showToast('error', 'Approval failed', getErrorMessage(error, 'Could not approve this modification.'));
    } finally {
      setActiveBookingId(null);
    }
  }

  async function handleRejectModification(modification: BookingModificationResponse) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    if (!decisionReason.trim()) {
      showToast('warning', 'Reason required', 'A rejection reason is required.');
      return;
    }

    setActiveBookingId(modification.id);
    try {
      await rejectModification(accessToken, modification.id, { decisionReason: decisionReason.trim() });
      await reload();
      setShowModificationDetail(false);
      setSelectedModification(null);
      setDecisionReason('');
      showToast('success', 'Modification rejected', 'The reschedule request has been rejected.');
    } catch (error) {
      showToast('error', 'Rejection failed', getErrorMessage(error, 'Could not reject this modification.'));
    } finally {
      setActiveBookingId(null);
    }
  }

  async function handleMarkNoShow(booking: BookingResponse) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    const confirmed = window.confirm(`Mark booking as no-show? ${booking.resource.name}`);
    if (!confirmed) return;

    setActiveBookingId(booking.id);
    try {
      await markBookingAsNoShow(accessToken, booking.id);
      await reload();
      showToast('success', 'Marked as no-show', 'Booking has been marked as no-show.');
    } catch (error) {
      showToast('error', 'Failed', getErrorMessage(error, 'Could not update booking status.'));
    } finally {
      setActiveBookingId(null);
    }
  }

  async function handleCompleteBooking(booking: BookingResponse) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    setActiveBookingId(booking.id);
    try {
      await completeBooking(accessToken, booking.id);
      await reload();
      showToast('success', 'Booking completed', 'Booking has been marked as completed.');
    } catch (error) {
      showToast('error', 'Failed', getErrorMessage(error, 'Could not complete booking.'));
    } finally {
      setActiveBookingId(null);
    }
  }

  function resetBookingFilters() {
    setSearchText('');
    setStatusFilter('');
    setCategoryFilter('');
    setSubcategoryFilter('');
    setResourceFilter('');
  }

  const elevatedCardStyle: React.CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--border) 74%, transparent)',
    boxShadow: '0 16px 40px rgba(10, 24, 58, 0.08)',
    background:
      'linear-gradient(145deg, color-mix(in srgb, var(--bg-card) 92%, #ffffff 8%), color-mix(in srgb, var(--bg-card) 97%, #dce8ff 3%))',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div
        style={{
          padding: '22px 24px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
          background:
            'radial-gradient(circle at 88% -25%, rgba(52, 132, 255, 0.2), transparent 60%), linear-gradient(150deg, color-mix(in srgb, var(--bg-card) 92%, #ffffff 8%), color-mix(in srgb, var(--bg-card) 97%, #e5eeff 3%))',
          boxShadow: '0 22px 44px rgba(14, 32, 70, 0.1)',
        }}
      >
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
          Review booking requests, manage approvals, modifications, and keep resource schedules conflict-free.
        </p>
      </div>



      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
        }}
      >
        {[
          { label: 'Pending Bookings', value: pendingBookings.toString() },
          { label: 'Approved', value: approvedBookings.toString() },
          { label: 'Pending Mods', value: pendingModifications.toString(), highlight: pendingModifications > 0 },
          { label: 'Rejected', value: rejectedBookings.toString() },
        ].map((item) => (
          <Card key={item.label} style={{ backgroundColor: item.highlight ? 'rgba(255, 193, 7, 0.1)' : undefined }}>
            <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              {item.label}
            </p>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: item.highlight ? '#FFC107' : 'var(--text-h)' }}>
              {item.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: 8,
          border: '1px solid color-mix(in srgb, var(--border) 78%, transparent)',
          borderRadius: 'var(--radius-lg)',
          background: 'color-mix(in srgb, var(--bg-card) 95%, #f4f7ff 5%)',
        }}
      >
        {(['bookings', 'modifications', 'checkins'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '11px 14px',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              borderRadius: 10,
              fontWeight: activeTab === tab ? 700 : 600,
              color: activeTab === tab ? '#114db8' : 'var(--text-secondary)',
              background: activeTab === tab
                ? 'linear-gradient(140deg, rgba(64, 131, 255, 0.2), rgba(180, 215, 255, 0.18))'
                : 'transparent',
              boxShadow: activeTab === tab ? 'inset 0 0 0 1px rgba(64, 131, 255, 0.18)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {tab === 'bookings' && 'Booking Requests'}
            {tab === 'modifications' && `Modification Requests${pendingModifications > 0 ? ` (${pendingModifications})` : ''}`}
            {tab === 'checkins' && 'Check-in Management'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <BookingScreenSkeleton variant="manager" />
      ) : loadError ? (
        <Alert variant="error" title="Error">
          {loadError}
        </Alert>
      ) : (
        <>
          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <Card style={{ ...elevatedCardStyle, padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                <Input
                  id="manager-booking-search"
                  name="manager-booking-search"
                  label="Search"
                  placeholder="Search by resource, purpose, registration number"
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
                  id="manager-booking-category"
                  name="manager-booking-category"
                  label="Category"
                  value={categoryFilter}
                  onChange={(event) => {
                    const nextCategory = event.target.value;
                    setCategoryFilter(nextCategory);
                    setSubcategoryFilter('');
                    setResourceFilter('');
                  }}
                  placeholder="All categories"
                  options={categoryOptions}
                />
                <Select
                  id="manager-booking-subcategory"
                  name="manager-booking-subcategory"
                  label="Subcategory"
                  value={subcategoryFilter}
                  onChange={(event) => {
                    setSubcategoryFilter(event.target.value);
                    setResourceFilter('');
                  }}
                  placeholder="All subcategories"
                  options={subcategoryOptions}
                />
                <Select
                  id="manager-booking-resource"
                  name="manager-booking-resource"
                  label="Resource"
                  value={resourceFilter}
                  onChange={(event) => setResourceFilter(event.target.value)}
                  placeholder="All resources"
                  options={resourceOptions}
                />
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button variant="subtle" onClick={resetBookingFilters} fullWidth>
                    Clear Filters
                  </Button>
                </div>
              </div>

              <div
                style={{
                  overflowX: 'auto',
                  border: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'color-mix(in srgb, var(--bg-card) 96%, #f6f9ff 4%)',
                  boxShadow: '0 12px 30px rgba(10, 24, 58, 0.08)',
                }}
              >
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
                      const isCheckedInWindow = new Date(booking.startTime).getTime() <= Date.now() && new Date(booking.endTime).getTime() > Date.now();

                      return (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <div style={{ display: 'grid', gap: 4 }}>
                              <strong style={{ color: 'var(--text-h)' }}>{booking.resource.name}</strong>
                            </div>
                          </TableCell>
                          <TableCell>{booking.requesterRegistrationNumber ?? shortId(booking.requesterId)}</TableCell>
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
                                      void handleApproveBooking(booking);
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
                                      void handleRejectBooking(booking);
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {booking.status === 'APPROVED' && isCheckedInWindow && (
                                <>
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    loading={actionBusy}
                                    onClick={() => {
                                      void handleCompleteBooking(booking);
                                    }}
                                  >
                                    Complete
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="ghost-danger"
                                    loading={actionBusy}
                                    onClick={() => {
                                      void handleMarkNoShow(booking);
                                    }}
                                  >
                                    No-Show
                                  </Button>
                                </>
                              )}
                              {booking.status === 'APPROVED' && new Date(booking.startTime).getTime() > Date.now() && (
                                <Button
                                  size="xs"
                                  variant="ghost-danger"
                                  loading={actionBusy}
                                  onClick={() => {
                                    void handleCancelApprovedBooking(booking);
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
          )}

          {/* Modifications Tab */}
          {activeTab === 'modifications' && (
            <>
              {modifications.length === 0 ? (
                <Alert variant="info" title="No modifications">
                  There are no pending modification requests.
                </Alert>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {modifications.map((mod) => {
                    const booking = bookings.find((b) => b.id === mod.bookingId);
                    const actionBusy = activeBookingId === mod.id;

                    return (
                      <Card key={mod.id} style={{ ...elevatedCardStyle, padding: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
                          <div style={{ display: 'grid', gap: 12 }}>
                            {booking && (
                              <>
                                <div>
                                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Resource</p>
                                  <p style={{ margin: '4px 0 0', fontWeight: 600 }}>
                                    {booking.resource.name}
                                  </p>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                  <div>
                                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Current Time</p>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 500 }}>
                                      {formatDateTime(booking.startTime)} to {formatDateTime(booking.endTime)}
                                    </p>
                                  </div>
                                  <div>
                                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Requested Time</p>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 500, color: 'var(--primary)' }}>
                                      {formatDateTime(mod.requestedStartTime)} to {formatDateTime(mod.requestedEndTime)}
                                    </p>
                                  </div>
                                </div>

                                {mod.reason && (
                                  <div>
                                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Reason</p>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{mod.reason}</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: 8 }}>
                            {mod.status === 'PENDING' && (
                              <>
                                <Button
                                  size="xs"
                                  variant="success"
                                  loading={actionBusy}
                                  onClick={() => {
                                    void handleApproveModification(mod);
                                  }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="xs"
                                  variant="ghost-danger"
                                  loading={actionBusy}
                                  onClick={() => {
                                    setSelectedModification(mod);
                                    setShowModificationDetail(true);
                                    setDecisionReason('');
                                  }}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {mod.status === 'APPROVED' && (
                              <Chip color="green">Approved</Chip>
                            )}
                            {mod.status === 'REJECTED' && (
                              <div>
                                <Chip color="red">Rejected</Chip>
                                {mod.decisionReason && (
                                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Reason: {mod.decisionReason}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Check-in Tab */}
          {activeTab === 'checkins' && (
            <>
              {bookings.filter((b) => b.status === 'APPROVED' || b.checkInStatus).length === 0 ? (
                <Alert variant="info" title="No active bookings">
                  There are no bookings to manage check-ins for.
                </Alert>
              ) : (
                <Card style={{ ...elevatedCardStyle, padding: 20 }}>
                  <div
                    style={{
                      overflowX: 'auto',
                      border: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
                      borderRadius: 'var(--radius-lg)',
                      background: 'color-mix(in srgb, var(--bg-card) 96%, #f6f9ff 4%)',
                    }}
                  >
                    <Table>
                      <TableHead>
                        <TableRow hoverable={false}>
                          <TableHeader>Resource</TableHeader>
                          <TableHeader>Booking Time</TableHeader>
                          <TableHeader>Check-in Status</TableHeader>
                          <TableHeader>Actions</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {bookings
                          .filter((b) => b.status === 'APPROVED' || b.checkInStatus)
                          .map((booking) => {
                            const actionBusy = activeBookingId === booking.id;
                            const isCheckedInWindow = new Date(booking.startTime).getTime() <= Date.now() && new Date(booking.endTime).getTime() > Date.now();

                            return (
                              <TableRow key={booking.id}>
                                <TableCell>
                                  <div>
                                    <strong>{booking.resource.name}</strong>
                                  </div>
                                </TableCell>
                                <TableCell style={{ fontSize: 12 }}>
                                  <div>{formatDateTime(booking.startTime)}</div>
                                  <div style={{ color: 'var(--text-muted)' }}>{formatDateTime(booking.endTime)}</div>
                                </TableCell>
                                <TableCell>
                                  {booking.checkInStatus ? (
                                    <Chip color={booking.checkInStatus === 'CHECKED_IN' ? 'blue' : booking.checkInStatus === 'NO_SHOW' ? 'red' : 'green'}>
                                      {booking.checkInStatus}
                                    </Chip>
                                  ) : (
                                    <Chip color={isCheckedInWindow ? 'yellow' : 'neutral'}>
                                      {isCheckedInWindow ? 'Ready for Check-in' : 'Not Started'}
                                    </Chip>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    {isCheckedInWindow && !booking.checkInStatus && (
                                      <>
                                        <Button
                                          size="xs"
                                          variant="success"
                                          loading={actionBusy}
                                          onClick={() => {
                                            void handleCompleteBooking(booking);
                                          }}
                                        >
                                          Complete
                                        </Button>
                                        <Button
                                          size="xs"
                                          variant="ghost-danger"
                                          loading={actionBusy}
                                          onClick={() => {
                                            void handleMarkNoShow(booking);
                                          }}
                                        >
                                          No-Show
                                        </Button>
                                      </>
                                    )}
                                    {!isCheckedInWindow && !booking.checkInStatus && (
                                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Pending</span>
                                    )}
                                    {booking.checkInStatus && (
                                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Completed</span>
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
              )}
            </>
          )}
        </>
      )}

      {/* Modification Rejection Dialog */}
        <Dialog open={showModificationDetail && !!selectedModification} onClose={() => { setShowModificationDetail(false); setSelectedModification(null); }} title="Reject Modification Request">
        {selectedModification && (
          <div style={{ display: 'grid', gap: 12 }}>
            <Alert variant="info" title="Enter rejection reason">
              Provide a reason for rejecting this modification request.
            </Alert>
            <Textarea
              label="Rejection Reason"
              placeholder="Enter reason..."
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              rows={4}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost-danger" onClick={() => { setShowModificationDetail(false); setSelectedModification(null); }}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={activeBookingId === selectedModification.id}
                onClick={() => {
                  void handleRejectModification(selectedModification);
                }}
              >
                Reject
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
