'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Download,
  Image as ImageIcon,
  MapPin,
  QrCode,
  Ruler,
  Settings,
  Sparkles,
  Tag,
  Users,
} from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip, Skeleton } from '@/components/ui';
import { fetchResourceQrPngBlob, getErrorMessage, getResource } from '@/lib/api-client';
import type { ResourceResponse } from '@/lib/api-types';
import { getLocationTypeLabel, getWingLabel } from '@/lib/location-display';
import {
  getResourceCategoryChipColor,
  getResourceCategoryLabel,
  getResourceStatusChipColor,
  getResourceStatusLabel,
  resourceAvailabilityLabel,
} from '@/lib/resource-display';
import { sanitizeRedirectPath } from '@/lib/auth-routing';

interface ResourceDetailScreenProps {
  resourceId: string;
  /** List page to return to (catalogue managers use a different path than admins). */
  backHref?: string;
  backLabel?: string;
}

function formatTime(value: string | null) {
  if (!value) {
    return 'Any time';
  }
  return value;
}

function formatInstant(value: string | null | undefined) {
  if (!value) {
    return '—';
  }
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

function DetailBlock({
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
        gap: 6,
        padding: 14,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
        background: 'color-mix(in srgb, var(--bg-card) 94%, transparent)',
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
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        <span aria-hidden="true" style={{ display: 'inline-flex' }}>{icon}</span>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', wordBreak: 'break-word' }}>
        {value ?? '—'}
      </div>
    </div>
  );
}

export function ResourceDetailScreen({
  resourceId,
  backHref = '/admin/resources',
  backLabel = 'Back to Catalogue',
}: ResourceDetailScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;

  const returnTo = sanitizeRedirectPath(searchParams.get('returnTo'));
  const resolvedBackHref = returnTo ?? backHref;
  const resolvedBackLabel = returnTo
    ? returnTo.includes('/tickets')
      ? 'Back to ticket'
      : 'Back'
    : backLabel;

  const [resource, setResource] = React.useState<ResourceResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [qrUrl, setQrUrl] = React.useState<string | null>(null);
  const [qrBlob, setQrBlob] = React.useState<Blob | null>(null);
  const [qrLoading, setQrLoading] = React.useState(false);
  const [qrError, setQrError] = React.useState<string | null>(null);

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
    return () => {
      if (qrUrl) {
        URL.revokeObjectURL(qrUrl);
      }
    };
  }, [qrUrl]);

  async function handleGenerateQr() {
    if (!accessToken) {
      setQrError('Your session is unavailable. Please sign in again.');
      return;
    }

    setQrLoading(true);
    setQrError(null);

    try {
      const blob = await fetchResourceQrPngBlob(accessToken, resourceId, 512);
      const nextUrl = URL.createObjectURL(blob);
      if (qrUrl) {
        URL.revokeObjectURL(qrUrl);
      }
      setQrBlob(blob);
      setQrUrl(nextUrl);
    } catch (error) {
      setQrBlob(null);
      setQrUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      setQrError(getErrorMessage(error, 'We could not generate the QR code.'));
    } finally {
      setQrLoading(false);
    }
  }

  function handleDownloadQr() {
    if (!qrBlob) {
      return;
    }
    const downloadUrl = URL.createObjectURL(qrBlob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = `resource-${resourceId}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
  }

  const featureChips = resource?.features ?? [];
  const locationDetails = resource?.locationDetails ?? null;
  const buildingLabel = locationDetails?.buildingName
    ? `${locationDetails.buildingName}${locationDetails.buildingCode ? ` (${locationDetails.buildingCode})` : ''}`
    : resource?.location ?? '—';

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
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
            Resource Detail
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 900,
              lineHeight: 1.1,
              color: 'var(--text-h)',
            }}
          >
            {loading ? 'Loading resource…' : resource?.name ?? 'Resource not found'}
          </h1>
          {!loading && resource && (
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
              {resource.code} &middot; {getResourceCategoryLabel(resource.category)}
              {resource.subcategory ? ` · ${resource.subcategory}` : ''}
            </p>
          )}
        </div>

        <Button
          variant="glass"
          size="sm"
          iconLeft={<ArrowLeft size={14} />}
          onClick={() => router.push(resolvedBackHref)}
        >
          {resolvedBackLabel}
        </Button>
      </div>

      {loadError && (
        <Alert variant="error" title="Unable to load resource">
          {loadError}
        </Alert>
      )}

      {loading ? (
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <Skeleton variant="line" height={20} width="40%" />
            <Skeleton variant="rect" height={60} />
            <Skeleton variant="rect" height={60} />
            <Skeleton variant="rect" height={120} />
          </div>
        </Card>
      ) : resource ? (
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 1fr)' }}>
          <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
            <Card style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Sparkles size={18} />
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                    Overview
                  </div>
                </div>
                <div style={{ display: 'inline-flex', gap: 6 }}>
                  <Chip color={getResourceCategoryChipColor(resource.category)}>
                    {getResourceCategoryLabel(resource.category)}
                  </Chip>
                  <Chip color={getResourceStatusChipColor(resource.status)}>
                    {getResourceStatusLabel(resource.status)}
                  </Chip>
                  <Chip color={resource.bookable ? 'green' : 'neutral'}>
                    {resource.bookable ? 'Bookable' : 'Not Bookable'}
                  </Chip>
                </div>
              </div>

              {resource.description && (
                <p style={{ margin: '14px 0 0', color: 'var(--text-body)', fontSize: 14, lineHeight: 1.6 }}>
                  {resource.description}
                </p>
              )}

              <div
                style={{
                  marginTop: 18,
                  display: 'grid',
                  gap: 12,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                }}
              >
                <DetailBlock
                  icon={<Tag size={12} />}
                  label="Code"
                  value={<span style={{ fontFamily: 'var(--font-mono)' }}>{resource.code}</span>}
                />
                <DetailBlock
                  icon={<Settings size={12} />}
                  label="Type"
                  value={resource.resourceType?.name ?? resource.subcategory ?? '—'}
                />
                <DetailBlock
                  icon={<Users size={12} />}
                  label="Capacity"
                  value={resource.capacity != null ? resource.capacity.toLocaleString() : '—'}
                />
                <DetailBlock
                  icon={<Ruler size={12} />}
                  label="Quantity"
                  value={resource.quantity != null ? resource.quantity.toLocaleString() : '—'}
                />
                <DetailBlock
                  icon={<Clock size={12} />}
                  label="Available Window"
                  value={resourceAvailabilityLabel({
                    availableFrom: resource.availableFrom ? formatTime(resource.availableFrom) : null,
                    availableTo: resource.availableTo ? formatTime(resource.availableTo) : null,
                  })}
                />
                <DetailBlock
                  icon={<Calendar size={12} />}
                  label="Updated"
                  value={formatInstant(resource.updatedAt)}
                />
              </div>
            </Card>

            <Card style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MapPin size={18} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                  Location
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: 'grid',
                  gap: 12,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                }}
              >
                <DetailBlock
                  icon={<MapPin size={12} />}
                  label="Location"
                  value={locationDetails?.locationName ?? resource.location ?? '—'}
                />
                <DetailBlock
                  icon={<Building2 size={12} />}
                  label="Building"
                  value={buildingLabel}
                />
                <DetailBlock
                  icon={<Settings size={12} />}
                  label="Wing"
                  value={locationDetails ? getWingLabel(locationDetails.wing) : '—'}
                />
                <DetailBlock
                  icon={<Settings size={12} />}
                  label="Floor"
                  value={locationDetails?.floor ?? '—'}
                />
                <DetailBlock
                  icon={<Tag size={12} />}
                  label="Room"
                  value={locationDetails?.roomCode ?? '—'}
                />
                <DetailBlock
                  icon={<Tag size={12} />}
                  label="Location Type"
                  value={locationDetails ? getLocationTypeLabel(locationDetails.locationType) : '—'}
                />
              </div>
            </Card>

            <Card style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={18} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                  Features
                </div>
              </div>
              {featureChips.length === 0 ? (
                <p style={{ margin: '12px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  No features are configured for this resource.
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {featureChips.map((feature) => (
                    <Chip key={feature.code} color="blue">
                      {feature.name}
                    </Chip>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card style={{ padding: 20, alignSelf: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <QrCode size={18} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                Quick Booking QR
              </div>
            </div>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.6 }}>
              Generate a scannable QR code that takes students directly to the quick booking page for {resource.code}.
            </p>

            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed color-mix(in srgb, var(--border) 70%, transparent)',
                background: 'color-mix(in srgb, var(--bg-card) 96%, transparent)',
                display: 'grid',
                placeItems: 'center',
                minHeight: 240,
              }}
            >
              {qrLoading ? (
                <div style={{ display: 'grid', gap: 8, placeItems: 'center' }}>
                  <Skeleton variant="rect" height={200} width="200px" />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Generating QR…</span>
                </div>
              ) : qrUrl ? (
                <div style={{ display: 'grid', gap: 10, placeItems: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Blob URL from authenticated fetch; next/image cannot load object URLs */}
                  <img
                    src={qrUrl}
                    alt={`QR code for ${resource.name}`}
                    style={{
                      width: 220,
                      height: 220,
                      borderRadius: 'var(--radius-md)',
                      background: 'white',
                      padding: 8,
                      boxShadow: '0 6px 20px -10px rgba(0,0,0,0.35)',
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {resource.code} · scan to book
                  </span>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10, placeItems: 'center', textAlign: 'center', padding: 12 }}>
                  <ImageIcon size={28} strokeWidth={1.2} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    No QR generated yet.
                  </span>
                </div>
              )}
            </div>

            {qrError && (
              <div style={{ marginTop: 12 }}>
                <Alert variant="error" title="QR generation failed">
                  {qrError}
                </Alert>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Button
                variant="primary"
                size="sm"
                iconLeft={<QrCode size={14} />}
                onClick={handleGenerateQr}
                loading={qrLoading}
                style={{ flex: 1 }}
              >
                {qrUrl ? 'Regenerate QR Code' : 'Generate QR Code'}
              </Button>
              <Button
                variant="subtle"
                size="sm"
                iconLeft={<Download size={14} />}
                onClick={handleDownloadQr}
                disabled={!qrBlob || qrLoading}
              >
                Download
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        !loadError && (
          <Alert variant="warning" title="Resource unavailable">
            We could not find a resource with id {resourceId}.
          </Alert>
        )
      )}
    </div>
  );
}
