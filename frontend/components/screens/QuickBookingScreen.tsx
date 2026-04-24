'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  MapPin,
  QrCode,
  Sparkles,
  Tag,
  Users,
} from 'lucide-react';

import { BookingAlert as Alert } from '@/components/booking/BookingAlert';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button, Card, Chip, Input, Skeleton, Textarea } from '@/components/ui';
import {
  createBooking,
  getErrorMessage,
  getResource,
  getResourceRemainingRanges,
} from '@/lib/api-client';
import type {
  ResourceRemainingRangesResponse,
  ResourceResponse,
} from '@/lib/api-types';
import { getLocationTypeLabel, getWingLabel } from '@/lib/location-display';
import {
  getResourceCategoryChipColor,
  getResourceCategoryLabel,
  getResourceStatusChipColor,
  getResourceStatusLabel,
} from '@/lib/resource-display';

interface QuickBookingScreenProps {
  resourceId: string;
}

const SPACES_HINT = 'Space bookings are limited to 3 hours.';

function localDateTimeToIso(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function getIsoDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-LK', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 4,
        padding: 12,
        borderRadius: 'var(--radius-lg)',
        background: 'color-mix(in srgb, var(--bg-card) 94%, transparent)',
        border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        <span aria-hidden="true" style={{ display: 'inline-flex' }}>{icon}</span>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', wordBreak: 'break-word' }}>
        {value ?? '—'}
      </div>
    </div>
  );
}

export function QuickBookingScreen({ resourceId }: QuickBookingScreenProps) {
  const router = useRouter();
  const { session, appUser } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.access_token ?? null;

  const [resource, setResource] = React.useState<ResourceResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [startTime, setStartTime] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [purpose, setPurpose] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submittedBookingId, setSubmittedBookingId] = React.useState<string | null>(null);

  const [remaining, setRemaining] = React.useState<ResourceRemainingRangesResponse | null>(null);
  const [remainingLoading, setRemainingLoading] = React.useState(false);
  const [remainingError, setRemainingError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!accessToken) {
        setLoadError('Your session is unavailable. Please sign in again.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const result = await getResource(accessToken, resourceId);
        if (!cancelled) {
          setResource(result);
        }
      } catch (error) {
        if (!cancelled) {
          setResource(null);
          setLoadError(getErrorMessage(error, 'We could not load this resource.'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [accessToken, resourceId]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadRemaining() {
      if (!accessToken || !resource || !resource.bookable || resource.status !== 'ACTIVE') {
        setRemaining(null);
        setRemainingError(null);
        return;
      }

      const date = getIsoDate(startTime) ?? new Date().toISOString().slice(0, 10);
      setRemainingLoading(true);
      setRemainingError(null);

      try {
        const result = await getResourceRemainingRanges(accessToken, resource.id, date);
        if (!cancelled) {
          setRemaining(result);
        }
      } catch (error) {
        if (!cancelled) {
          setRemaining(null);
          setRemainingError(getErrorMessage(error, 'Could not load availability.'));
        }
      } finally {
        if (!cancelled) {
          setRemainingLoading(false);
        }
      }
    }

    void loadRemaining();

    return () => {
      cancelled = true;
    };
  }, [accessToken, resource, startTime]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || !resource) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    if (!resource.bookable || resource.status !== 'ACTIVE') {
      setSubmitError('This resource is not available for booking right now.');
      return;
    }

    const startIso = localDateTimeToIso(startTime);
    const endIso = localDateTimeToIso(endTime);
    if (!startIso || !endIso) {
      setSubmitError('Please enter a valid start and end time.');
      return;
    }

    if (new Date(startIso).getTime() >= new Date(endIso).getTime()) {
      setSubmitError('Start time must be before end time.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const booking = await createBooking(accessToken, {
        resourceId: resource.id,
        startTime: startIso,
        endTime: endIso,
        purpose: purpose.trim() || undefined,
      });
      setSubmittedBookingId(booking.id);
      showToast('success', 'Booking submitted', 'Your booking request is pending approval.');
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'We could not submit your booking.'));
    } finally {
      setSubmitting(false);
    }
  }

  const location = resource?.locationDetails ?? null;
  const buildingLabel = location?.buildingName
    ? `${location.buildingName}${location.buildingCode ? ` (${location.buildingCode})` : ''}`
    : resource?.location ?? '—';
  const bookable = Boolean(resource && resource.bookable && resource.status === 'ACTIVE');
  const spacesHint = resource?.category === 'SPACES' ? SPACES_HINT : null;
  const homePath = appUser?.userType === 'FACULTY' ? '/faculty/bookings' : '/students/bookings';

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 20 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <Skeleton variant="line" height={20} width="40%" />
            <Skeleton variant="rect" height={120} />
            <Skeleton variant="rect" height={180} />
          </div>
        </Card>
      </div>
    );
  }

  if (loadError || !resource) {
    return (
      <div style={{ display: 'grid', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 900,
              color: 'var(--text-h)',
            }}
          >
            Quick Booking
          </h1>
          <Button
            variant="glass"
            size="sm"
            iconLeft={<ArrowLeft size={14} />}
            onClick={() => router.push(homePath)}
          >
            Back to Bookings
          </Button>
        </div>
        <Alert variant="error" title="Resource unavailable">
          {loadError ?? 'We could not find the resource you scanned. It may have been removed.'}
        </Alert>
      </div>
    );
  }

  if (submittedBookingId) {
    return (
      <div style={{ display: 'grid', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 900,
              color: 'var(--text-h)',
            }}
          >
            Booking Submitted
          </h1>
        </div>
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                display: 'grid',
                placeItems: 'center',
                background: 'color-mix(in srgb, var(--green-400) 18%, transparent)',
                color: 'var(--green-500)',
              }}
            >
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                Your booking is pending approval
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                {resource.name} · {resource.code}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              iconLeft={<ChevronRight size={14} />}
              onClick={() => router.push(homePath)}
            >
              View My Bookings
            </Button>
            <Button
              variant="subtle"
              onClick={() => {
                setSubmittedBookingId(null);
                setStartTime('');
                setEndTime('');
                setPurpose('');
              }}
            >
              Book Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
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
            Quick Booking
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 30,
              fontWeight: 900,
              lineHeight: 1.1,
              color: 'var(--text-h)',
            }}
          >
            Book {resource.name}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            {resource.code} &middot; {getResourceCategoryLabel(resource.category)}
          </p>
        </div>

        <Button
          variant="glass"
          size="sm"
          iconLeft={<ArrowLeft size={14} />}
          onClick={() => router.push(homePath)}
        >
          Back to Bookings
        </Button>
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          borderRadius: 999,
          border: '1px solid color-mix(in srgb, var(--yellow-400) 35%, transparent)',
          background: 'color-mix(in srgb, var(--yellow-400) 14%, transparent)',
          color: 'var(--text-h)',
          fontSize: 12.5,
          fontWeight: 700,
          width: 'fit-content',
        }}
      >
        <QrCode size={14} />
        Resource auto-selected via QR scan
      </div>

      {!bookable && (
        <Alert variant="warning" title="This resource cannot be booked right now">
          {resource.status !== 'ACTIVE'
            ? `The resource is currently ${getResourceStatusLabel(resource.status).toLowerCase()}.`
            : 'This resource is not configured to accept booking requests.'}
        </Alert>
      )}

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1.15fr) minmax(260px, 1fr)' }}>
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={18} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                Booking Details
              </div>
            </div>
            <Chip color={getResourceStatusChipColor(resource.status)}>
              {getResourceStatusLabel(resource.status)}
            </Chip>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, marginTop: 16 }}>
            <div
              style={{
                display: 'grid',
                gap: 6,
                padding: 14,
                borderRadius: 'var(--radius-lg)',
                border: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
                background: 'color-mix(in srgb, var(--bg-card) 96%, transparent)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '.18em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                Resource (locked)
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-h)' }}>
                {resource.name}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {resource.code} · {getResourceCategoryLabel(resource.category)}
              </div>
              {/* Hidden resource id is submitted via state, not via the form, for safety. */}
            </div>

            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <Input
                id="quick-booking-start"
                label="Start"
                type="datetime-local"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                disabled={!bookable || submitting}
                required
              />
              <Input
                id="quick-booking-end"
                label="End"
                type="datetime-local"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                disabled={!bookable || submitting}
                required
              />
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label
                htmlFor="quick-booking-purpose"
                style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-h)' }}
              >
                Purpose (optional)
              </label>
              <Textarea
                id="quick-booking-purpose"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="Describe how you plan to use the resource"
                rows={3}
                disabled={!bookable || submitting}
              />
            </div>

            {spacesHint && (
              <Alert variant="info" title="Duration guidance">
                {spacesHint}
              </Alert>
            )}

            {submitError && (
              <Alert variant="error" title="Booking failed">
                {submitError}
              </Alert>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStartTime('');
                  setEndTime('');
                  setPurpose('');
                  setSubmitError(null);
                }}
                disabled={submitting}
              >
                Clear
              </Button>
              <Button type="submit" loading={submitting} disabled={!bookable}>
                Submit Booking Request
              </Button>
            </div>
          </form>
        </Card>

        <Card style={{ padding: 20, alignSelf: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={18} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--text-h)' }}>
              Resource Summary
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            <SummaryRow
              icon={<Tag size={11} />}
              label="Category"
              value={
                <div style={{ display: 'inline-flex', gap: 4 }}>
                  <Chip color={getResourceCategoryChipColor(resource.category)}>
                    {getResourceCategoryLabel(resource.category)}
                  </Chip>
                </div>
              }
            />
            <SummaryRow
              icon={<Users size={11} />}
              label="Capacity"
              value={resource.capacity != null ? resource.capacity.toLocaleString() : '—'}
            />
            <SummaryRow
              icon={<MapPin size={11} />}
              label="Location"
              value={location?.locationName ?? resource.location ?? '—'}
            />
            <SummaryRow
              icon={<MapPin size={11} />}
              label="Building"
              value={buildingLabel}
            />
            <SummaryRow
              icon={<MapPin size={11} />}
              label="Details"
              value={
                location
                  ? [
                      getWingLabel(location.wing),
                      location.floor,
                      location.roomCode,
                      getLocationTypeLabel(location.locationType),
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'
                  : '—'
              }
            />
            {resource.features.length > 0 && (
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '.18em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  Features
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {resource.features.map((feature) => (
                    <Chip key={feature.code} color="blue" size="sm">
                      {feature.name}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              Remaining slots
            </div>
            {remainingLoading ? (
              <Skeleton variant="line" height={12} width="80%" />
            ) : remainingError ? (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                {remainingError}
              </p>
            ) : remaining && remaining.remainingRanges.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {remaining.remainingRanges.map((range, index) => (
                  <Chip key={`${range.startTime}-${range.endTime}-${index}`} color="blue" size="sm">
                    {formatDateTime(range.startTime)} – {formatDateTime(range.endTime)}
                  </Chip>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                No remaining ranges for the selected day.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
