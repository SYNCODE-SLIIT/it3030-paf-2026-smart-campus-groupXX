'use client';

import React from 'react';
import { Check, Search, X } from 'lucide-react';

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
  Tabs,
  Textarea,
} from '@/components/ui';
import {
  BookingCard,
  BookingCardSkeleton,
  BookingSection,
} from '@/components/booking/BookingCard';
import {
  approveBooking,
  approveModification,
  cancelApprovedBookingAsManager,
  completeBooking,
  getResource,
  getErrorMessage,
  listAllBookings,
  listPendingModifications,
  listResourceOptions,
  markBookingAsNoShow,
  rejectBooking,
  rejectModification,
} from '@/lib/api-client';
import type {
  BookingModificationResponse,
  BookingResponse,
  BookingStatus,
  ResourceOption,
  ResourceResponse,
} from '@/lib/api-types';
import { getLocationTypeLabel, getWingLabel } from '@/lib/location-display';
import { getResourceCategoryLabel } from '@/lib/resource-display';

type TabType = 'bookings' | 'modifications' | 'checkins';
type StatusFilter = BookingStatus | 'ALL';

const BOOKING_SECTIONS: Array<{ status: BookingStatus; label: string; color: string }> = [
  { status: 'PENDING', label: 'Pending Review', color: 'var(--yellow-400)' },
  { status: 'APPROVED', label: 'Approved', color: 'var(--green-400)' },
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

function normalizeSubcategory(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return value.trim().replace(/[\s-]+/g, '_').toUpperCase();
}

function shortId(value: string) {
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

function isCheckInWindow(booking: BookingResponse) {
  const now = Date.now();
  const startTime = new Date(booking.startTime).getTime();
  const endTime = new Date(booking.endTime).getTime();
  return startTime <= now && endTime > now;
}

type BookingScreenResource = ResourceOption | ResourceResponse;

function isSpaceResource(resource?: BookingScreenResource | null) {
  return resource?.category === 'SPACES';
}

function resolveResourceLocationLabel(resource?: BookingScreenResource | null) {
  return resource?.locationDetails?.locationName ?? resource?.location ?? resource?.locationName ?? '';
}

function ManagerBookingSectionsSkeleton() {
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

export function ManagerBookingsScreenEnhanced() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.access_token ?? null;

  const [bookings, setBookings] = React.useState<BookingResponse[]>([]);
  const [modifications, setModifications] = React.useState<BookingModificationResponse[]>([]);
  const [resources, setResources] = React.useState<ResourceOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [activeBookingId, setActiveBookingId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<TabType>('bookings');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [subcategoryFilter, setSubcategoryFilter] = React.useState('');
  const [resourceFilter, setResourceFilter] = React.useState('');
  const [searchText, setSearchText] = React.useState('');
  const deferredSearch = React.useDeferredValue(searchText);
  const [selectedModification, setSelectedModification] = React.useState<BookingModificationResponse | null>(null);
  const [modificationDecisionReason, setModificationDecisionReason] = React.useState('');
  const [bookingDecision, setBookingDecision] = React.useState<{
    booking: BookingResponse;
    action: 'reject' | 'cancelApproved';
  } | null>(null);
  const [bookingDecisionReason, setBookingDecisionReason] = React.useState('');
  const [locationBooking, setLocationBooking] = React.useState<BookingResponse | null>(null);
  const [resourceDetailsById, setResourceDetailsById] = React.useState<Record<string, ResourceResponse>>({});

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
        listResourceOptions(accessToken, { status: 'ACTIVE' }),
      ]);
      const bookingResourceIds = Array.from(new Set(allBookings.map((booking) => booking.resource.id)));
      const detailedResources = await Promise.all(
        bookingResourceIds.map(async (resourceId) => {
          try {
            return await getResource(accessToken, resourceId);
          } catch {
            return null;
          }
        }),
      );

      setBookings(allBookings);
      setModifications(pendingMods);
      setResources(availableResources);
      setResourceDetailsById(
        detailedResources.reduce<Record<string, ResourceResponse>>((accumulator, resource) => {
          if (resource) {
            accumulator[resource.id] = resource;
          }
          return accumulator;
        }, {}),
      );
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load bookings.'));
      setBookings([]);
      setModifications([]);
      setResources([]);
      setResourceDetailsById({});
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const resourceById = React.useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource])),
    [resources],
  );
  const detailedResourceById = React.useMemo(
    () => new Map(Object.entries(resourceDetailsById)),
    [resourceDetailsById],
  );

  const categoryOptions = React.useMemo(
    () => Array.from(new Set(resources.map((resource) => resource.category)))
      .sort()
      .map((category) => ({ value: category, label: getResourceCategoryLabel(category) })),
    [resources],
  );

  const categoryFilteredResources = React.useMemo(
    () => categoryFilter
      ? resources.filter((resource) => resource.category === categoryFilter)
      : resources,
    [categoryFilter, resources],
  );

  const subcategoryOptions = React.useMemo(
    () => Array.from(
      new Set(
        categoryFilteredResources
          .map((resource) => resource.subcategory)
          .filter((subcategory): subcategory is string => Boolean(subcategory && subcategory.trim())),
      ),
    )
      .sort((left, right) => left.localeCompare(right))
      .map((subcategory) => ({ value: subcategory, label: subcategory })),
    [categoryFilteredResources],
  );

  const resourceOptions = React.useMemo(
    () => categoryFilteredResources
      .filter(
        (resource) => !subcategoryFilter
          || normalizeSubcategory(resource.subcategory) === normalizeSubcategory(subcategoryFilter),
      )
      .map((resource) => ({ value: resource.id, label: resource.name })),
    [categoryFilteredResources, subcategoryFilter],
  );

  const tabCounts = React.useMemo(() => ({
    ALL: bookings.length,
    PENDING: bookings.filter((booking) => booking.status === 'PENDING').length,
    APPROVED: bookings.filter((booking) => booking.status === 'APPROVED').length,
    CHECKED_IN: bookings.filter((booking) => booking.status === 'CHECKED_IN').length,
    COMPLETED: bookings.filter((booking) => booking.status === 'COMPLETED').length,
    REJECTED: bookings.filter((booking) => booking.status === 'REJECTED').length,
    CANCELLED: bookings.filter((booking) => booking.status === 'CANCELLED').length,
    NO_SHOW: bookings.filter((booking) => booking.status === 'NO_SHOW').length,
  }), [bookings]);

  const filteredBookings = React.useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();

    return bookings.filter((booking) => {
      const resource = detailedResourceById.get(booking.resource.id) ?? resourceById.get(booking.resource.id);

      if (statusFilter !== 'ALL' && booking.status !== statusFilter) {
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
        || resolveResourceLocationLabel(resource).toLowerCase().includes(needle)
      );
    });
  }, [bookings, categoryFilter, deferredSearch, detailedResourceById, resourceById, resourceFilter, statusFilter, subcategoryFilter]);

  const groupedBookings = React.useMemo(
    () => BOOKING_SECTIONS.map((section) => ({
      ...section,
      items: filteredBookings.filter((booking) => booking.status === section.status),
    })).filter((section) => section.items.length > 0),
    [filteredBookings],
  );

  const checkInBookings = React.useMemo(
    () => bookings.filter((booking) => {
      const resource = detailedResourceById.get(booking.resource.id) ?? resourceById.get(booking.resource.id);
      return isSpaceResource(resource) && (booking.status === 'APPROVED' || booking.checkInStatus);
    }),
    [bookings, detailedResourceById, resourceById],
  );

  const selectedLocationResource = locationBooking
    ? detailedResourceById.get(locationBooking.resource.id) ?? null
    : null;
  const selectedLocationDetails = selectedLocationResource?.locationDetails ?? null;
  const selectedLocationName = selectedLocationDetails?.locationName ?? selectedLocationResource?.location ?? null;
  const selectedLocationBuildingLabel = selectedLocationDetails?.buildingName
    ? `${selectedLocationDetails.buildingName}${selectedLocationDetails.buildingCode ? ` (${selectedLocationDetails.buildingCode})` : ''}`
    : 'N/A';

  const pendingBookings = bookings.filter((booking) => booking.status === 'PENDING').length;
  const approvedBookings = bookings.filter((booking) => booking.status === 'APPROVED').length;
  const pendingModifications = modifications.filter((modification) => modification.status === 'PENDING').length;
  const checkInCount = checkInBookings.length;

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

  async function handleBookingDecisionSubmit() {
    if (!accessToken || !bookingDecision) {
      return;
    }

    if (bookingDecision.action === 'reject' && !bookingDecisionReason.trim()) {
      showToast('warning', 'Reason required', 'A rejection reason is required.');
      return;
    }

    setActiveBookingId(bookingDecision.booking.id);
    try {
      if (bookingDecision.action === 'reject') {
        await rejectBooking(accessToken, bookingDecision.booking.id, { reason: bookingDecisionReason.trim() });
        showToast('success', 'Booking rejected', `${bookingDecision.booking.resource.name} was rejected.`);
      } else {
        const trimmedReason = bookingDecisionReason.trim();
        await cancelApprovedBookingAsManager(
          accessToken,
          bookingDecision.booking.id,
          trimmedReason ? { reason: trimmedReason } : undefined,
        );
        showToast('success', 'Booking cancelled', `${bookingDecision.booking.resource.name} was cancelled.`);
      }

      setBookingDecision(null);
      setBookingDecisionReason('');
      await reload();
    } catch (error) {
      showToast('error', 'Action failed', getErrorMessage(error, 'Could not update this booking.'));
    } finally {
      setActiveBookingId(null);
    }
  }

  async function handleApproveModification(modification: BookingModificationResponse) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    setActiveBookingId(modification.id);
    try {
      await approveModification(accessToken, modification.id);
      await reload();
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

    if (!modificationDecisionReason.trim()) {
      showToast('warning', 'Reason required', 'A rejection reason is required.');
      return;
    }

    setActiveBookingId(modification.id);
    try {
      await rejectModification(accessToken, modification.id, { decisionReason: modificationDecisionReason.trim() });
      await reload();
      setSelectedModification(null);
      setModificationDecisionReason('');
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
    setStatusFilter('ALL');
    setCategoryFilter('');
    setSubcategoryFilter('');
    setResourceFilter('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0, width: '100%', overflowX: 'hidden' }}>
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
          Review booking requests, approve changes, and manage active check-ins using the same card workflow as ticketing.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <Card>
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Pending
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-h)' }}>
            {pendingBookings}
          </p>
        </Card>
        <Card>
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Approved
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-h)' }}>
            {approvedBookings}
          </p>
        </Card>
        <Card>
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Pending Mods
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: pendingModifications > 0 ? 'var(--yellow-700)' : 'var(--text-h)' }}>
            {pendingModifications}
          </p>
        </Card>
        <Card>
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Check-In Queue
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-h)' }}>
            {checkInCount}
          </p>
        </Card>
      </div>

      <Tabs
        variant="pill"
        tabs={[
          { label: 'Bookings', value: 'bookings', badge: bookings.length },
          { label: 'Modifications', value: 'modifications', badge: modifications.length },
          { label: 'Check-Ins', value: 'checkins', badge: checkInCount },
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
          <Card style={{ padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              <div style={{ height: 44, background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }} />
              <div style={{ height: 44, background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }} />
              <div style={{ height: 44, background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }} />
            </div>
          </Card>
          <ManagerBookingSectionsSkeleton />
        </>
      ) : (
        <>
          {activeTab === 'bookings' && (
            <div style={{ display: 'grid', gap: 18, minWidth: 0 }}>
              <Card style={{ padding: 18, display: 'grid', gap: 14, minWidth: 0 }}>
                <Tabs
                  variant="pill"
                  tabs={[
                    { label: 'All', value: 'ALL', badge: tabCounts.ALL },
                    { label: 'Pending', value: 'PENDING', badge: tabCounts.PENDING },
                    { label: 'Approved', value: 'APPROVED', badge: tabCounts.APPROVED },
                    { label: 'Checked In', value: 'CHECKED_IN', badge: tabCounts.CHECKED_IN },
                    { label: 'Completed', value: 'COMPLETED', badge: tabCounts.COMPLETED },
                    { label: 'Rejected', value: 'REJECTED', badge: tabCounts.REJECTED },
                    { label: 'Cancelled', value: 'CANCELLED', badge: tabCounts.CANCELLED },
                    { label: 'No Show', value: 'NO_SHOW', badge: tabCounts.NO_SHOW },
                  ]}
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as StatusFilter)}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, minWidth: 0 }}>
                  <Input
                    id="manager-booking-search"
                    label="Search"
                    placeholder="Search by resource, purpose, requester, or location"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    iconLeft={<Search size={14} />}
                    autoComplete="off"
                  />
                  <Select
                    id="manager-booking-category"
                    label="Category"
                    value={categoryFilter}
                    onChange={(event) => {
                      setCategoryFilter(event.target.value);
                      setSubcategoryFilter('');
                      setResourceFilter('');
                    }}
                    options={[{ value: '', label: 'All categories' }, ...categoryOptions]}
                  />
                  <Select
                    id="manager-booking-subcategory"
                    label="Subcategory"
                    value={subcategoryFilter}
                    onChange={(event) => {
                      setSubcategoryFilter(event.target.value);
                      setResourceFilter('');
                    }}
                    options={[{ value: '', label: 'All subcategories' }, ...subcategoryOptions]}
                  />
                  <Select
                    id="manager-booking-resource"
                    label="Resource"
                    value={resourceFilter}
                    onChange={(event) => setResourceFilter(event.target.value)}
                    options={[{ value: '', label: 'All resources' }, ...resourceOptions]}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="subtle" onClick={resetBookingFilters}>
                    Clear Filters
                  </Button>
                </div>
              </Card>

              {bookings.length === 0 ? (
                <Alert variant="info" title="No bookings">
                  No bookings are available yet.
                </Alert>
              ) : groupedBookings.length === 0 ? (
                <Alert variant="info" title="No matches">
                  No bookings match the current filters.
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
                        const actionBusy = activeBookingId === booking.id;

                        return (
                          <div key={booking.id} style={{ minWidth: 320, maxWidth: 340, flexShrink: 0 }}>
                            <BookingCard
                              booking={booking}
                              resource={detailedResourceById.get(booking.resource.id) ?? resourceById.get(booking.resource.id)}
                              showRequester
                              onLocation={() => setLocationBooking(booking)}
                              actions={
                                <>
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
                                          setBookingDecision({ booking, action: 'reject' });
                                          setBookingDecisionReason('');
                                        }}
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {booking.status === 'APPROVED' && !isCheckInWindow(booking) && new Date(booking.startTime).getTime() > Date.now() && (
                                    <Button
                                      size="xs"
                                      variant="ghost-danger"
                                      loading={actionBusy}
                                      onClick={() => {
                                        setBookingDecision({ booking, action: 'cancelApproved' });
                                        setBookingDecisionReason('');
                                      }}
                                    >
                                      Cancel
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

          {activeTab === 'modifications' && (
            modifications.length === 0 ? (
              <Alert variant="info" title="No modifications">
                There are no pending modification requests.
              </Alert>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {modifications.map((modification) => {
                  const booking = bookings.find((entry) => entry.id === modification.bookingId);
                  const actionBusy = activeBookingId === modification.id;
                  const resource = booking
                    ? detailedResourceById.get(booking.resource.id) ?? resourceById.get(booking.resource.id)
                    : null;

                  return (
                    <Card
                      key={modification.id}
                      style={{
                        padding: 18,
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--card-shadow)',
                        display: 'grid',
                        gap: 14,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                            {booking?.resource.name ?? 'Booking modification'}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {booking?.resource.code ?? shortId(modification.bookingId)}
                            {resource?.locationName ? ` · ${resource.locationName}` : ''}
                          </div>
                        </div>
                        <Chip color="yellow" size="sm" dot>
                          Pending
                        </Chip>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                        <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', display: 'grid', gap: 5 }}>
                          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-muted)' }}>
                            Current Window
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--text-body)' }}>
                            {booking ? `${formatDateTime(booking.startTime)} to ${formatDateTime(booking.endTime)}` : 'Unavailable'}
                          </span>
                        </div>
                        <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'rgba(59,130,246,0.08)', display: 'grid', gap: 5 }}>
                          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-muted)' }}>
                            Requested Window
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--text-body)' }}>
                            {formatDateTime(modification.requestedStartTime)} to {formatDateTime(modification.requestedEndTime)}
                          </span>
                        </div>
                      </div>

                      {modification.reason && (
                        <Alert variant="info" title="Requester note">
                          {modification.reason}
                        </Alert>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                        <Button
                          size="sm"
                          variant="ghost-danger"
                          loading={actionBusy}
                          onClick={() => {
                            setSelectedModification(modification);
                            setModificationDecisionReason('');
                          }}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="success"
                          loading={actionBusy}
                          onClick={() => {
                            void handleApproveModification(modification);
                          }}
                        >
                          Approve
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          )}

          {activeTab === 'checkins' && (
            checkInBookings.length === 0 ? (
              <Alert variant="info" title="No active bookings">
                There are no bookings to manage check-ins for.
              </Alert>
            ) : (
              <BookingSection label="Check-In Queue" color="var(--blue-400)" count={checkInBookings.length}>
                {checkInBookings.map((booking) => {
                  const actionBusy = activeBookingId === booking.id;
                  const inWindow = isCheckInWindow(booking);

                  return (
                    <div key={booking.id} style={{ minWidth: 320, maxWidth: 340, flexShrink: 0 }}>
                      <BookingCard
                        booking={booking}
                        resource={detailedResourceById.get(booking.resource.id) ?? resourceById.get(booking.resource.id)}
                        showRequester
                        onLocation={() => setLocationBooking(booking)}
                        actions={
                          <>
                            {inWindow && !booking.checkInStatus && (
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
                          </>
                        }
                      />
                    </div>
                  );
                })}
              </BookingSection>
            )
          )}
        </>
      )}

      <Dialog
        open={!!bookingDecision}
        onClose={() => {
          setBookingDecision(null);
          setBookingDecisionReason('');
        }}
        title={bookingDecision?.action === 'reject' ? 'Reject Booking' : 'Cancel Approved Booking'}
        size="sm"
      >
        {bookingDecision && (
          <div style={{ padding: '20px 24px', display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body)' }}>
              {bookingDecision.action === 'reject'
                ? `Provide a reason for rejecting ${bookingDecision.booking.resource.name}.`
                : `Cancel the approved booking for ${bookingDecision.booking.resource.name}. You can include an optional reason.`}
            </p>
            <Textarea
              label={bookingDecision.action === 'reject' ? 'Rejection Reason' : 'Cancellation Reason'}
              placeholder={bookingDecision.action === 'reject' ? 'Enter rejection reason' : 'Optional manager note'}
              value={bookingDecisionReason}
              onChange={(event) => setBookingDecisionReason(event.target.value)}
              rows={4}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                variant="ghost"
                onClick={() => {
                  setBookingDecision(null);
                  setBookingDecisionReason('');
                }}
                disabled={activeBookingId === bookingDecision.booking.id}
              >
                Close
              </Button>
              <Button
                variant={bookingDecision.action === 'reject' ? 'danger' : 'ghost-danger'}
                loading={activeBookingId === bookingDecision.booking.id}
                onClick={() => {
                  void handleBookingDecisionSubmit();
                }}
              >
                {bookingDecision.action === 'reject' ? 'Reject Booking' : 'Cancel Booking'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={!!selectedModification}
        onClose={() => {
          setSelectedModification(null);
          setModificationDecisionReason('');
        }}
        title="Reject Modification Request"
        size="sm"
      >
        {selectedModification && (
          <div style={{ padding: '20px 24px', display: 'grid', gap: 12 }}>
            <Alert variant="info" title="Rejection reason">
              Provide a reason for rejecting this modification request.
            </Alert>
            <Textarea
              label="Rejection Reason"
              placeholder="Enter rejection reason"
              value={modificationDecisionReason}
              onChange={(event) => setModificationDecisionReason(event.target.value)}
              rows={4}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedModification(null);
                  setModificationDecisionReason('');
                }}
              >
                Close
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
                  {selectedLocationDetails ? getLocationTypeLabel(selectedLocationDetails.locationType) : 'N/A'}
                </span>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.12em' }}>
                  Building
                </span>
                <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>
                  {selectedLocationBuildingLabel}
                </span>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.12em' }}>
                  Wing
                </span>
                <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>
                  {selectedLocationDetails ? getWingLabel(selectedLocationDetails.wing) : 'N/A'}
                </span>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.12em' }}>
                  Floor
                </span>
                <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>
                  {selectedLocationDetails?.floor ?? 'N/A'}
                </span>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.12em' }}>
                  Room Code
                </span>
                <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>
                  {selectedLocationDetails?.roomCode ?? 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <Alert variant="warning" title="Location unavailable">
              We could not resolve the linked resource details for this booking right now.
            </Alert>
          )}
        </div>
      </Dialog>
    </div>
  );
}
