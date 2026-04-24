'use client';

import React from 'react';
import { BookOpen, CalendarPlus, ChevronLeft, ChevronRight, Layers, MapPin, Search, Users } from 'lucide-react';

import { ButtonLink } from '@/components/marketing/ButtonLink';
import { Reveal } from '@/components/marketing/Reveal';
import { Alert, Button, Card, Chip, Input, Select, Skeleton } from '@/components/ui';
import {
  fetchPublicCatalogResourcesByType,
  fetchPublicCatalogTypes,
  getErrorMessage,
} from '@/lib/api-client';
import type {
  PublicCatalogFilterMode,
  PublicCatalogResourceItem,
  PublicCatalogResourcePage,
  PublicCatalogTypeSummary,
  ResourceCategory,
} from '@/lib/api-types';
import {
  getResourceCategoryChipColor,
  getResourceCategoryLabel,
} from '@/lib/resource-display';

const PAGE_SIZE = 5;
const ROW_GAP = 10;
/** Fixed outer height per resource row (mini card + stripe); keeps five rows uniform. */
const ROW_HEIGHT = 94;
const ROWS_VISIBLE = 5;
const SLOTS_BLOCK_HEIGHT = ROWS_VISIBLE * ROW_HEIGHT + (ROWS_VISIBLE - 1) * ROW_GAP;
/** Fixed type-card height so every column aligns in the grid. */
const TYPE_CARD_MIN_HEIGHT = 738;
const HEADER_BLOCK_MIN = 108;
const PAGINATION_ROW_MIN = 52;

const CATEGORY_STRIPE: Record<ResourceCategory, string> = {
  SPACES: 'var(--blue-400)',
  TECHNICAL_EQUIPMENT: 'var(--yellow-400)',
  MAINTENANCE_AND_CLEANING: 'var(--orange-400)',
  SPORTS: 'var(--green-400)',
  EVENT_AND_DECORATION: 'var(--red-400)',
  GENERAL_UTILITY: 'var(--neutral-400)',
  TRANSPORT_AND_LOGISTICS: 'rgba(238,202,68,.85)',
};

function ResourceRowPlaceholder() {
  return (
    <div
      aria-hidden
      style={{
        height: ROW_HEIGHT,
        boxSizing: 'border-box',
        border: '1px dashed color-mix(in srgb, var(--border) 75%, transparent)',
        borderRadius: 'var(--radius-md)',
        background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
        flexShrink: 0,
      }}
    />
  );
}

function ResourceMiniCard({ resource }: { resource: PublicCatalogResourceItem }) {
  const stripe = CATEGORY_STRIPE[resource.category] ?? 'var(--yellow-400)';
  const location = resource.locationLabel?.trim() ? resource.locationLabel : '—';

  return (
    <div
      style={{
        height: ROW_HEIGHT,
        boxSizing: 'border-box',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface)',
        boxShadow: 'var(--card-shadow)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <div style={{ height: 2, background: stripe, flexShrink: 0 }} />
      <div
        style={{
          padding: '8px 12px 10px',
          display: 'grid',
          gap: 4,
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minHeight: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: '.05em',
              color: 'var(--text-muted)',
            }}
          >
            {resource.code}
          </span>
          <Chip size="sm" color={getResourceCategoryChipColor(resource.category)}>
            {getResourceCategoryLabel(resource.category)}
          </Chip>
          {resource.bookable ? (
            <Chip size="sm" color="green">
              Bookable
            </Chip>
          ) : (
            <Chip size="sm" color="neutral">
              View only
            </Chip>
          )}
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--text-h)',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}
        >
          {resource.name}
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px 12px',
            fontSize: 11,
            color: 'var(--text-muted)',
            minHeight: 0,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} strokeWidth={2.2} aria-hidden />
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}
            >
              {location}
            </span>
          </span>
          {resource.capacity != null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Users size={11} strokeWidth={2.2} aria-hidden />
              {resource.capacity.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ResourceTypeCatalogCard({
  type,
  searchDebounced,
  filterMode,
}: {
  type: PublicCatalogTypeSummary;
  searchDebounced: string;
  filterMode: PublicCatalogFilterMode;
}) {
  const stripe = CATEGORY_STRIPE[type.category] ?? 'var(--yellow-400)';
  const [page, setPage] = React.useState(0);
  const [data, setData] = React.useState<PublicCatalogResourcePage | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPage(0);
  }, [searchDebounced, filterMode, type.id]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const result = await fetchPublicCatalogResourcesByType(type.id, page, PAGE_SIZE, {
          search: searchDebounced || undefined,
          filter: filterMode,
        });
        if (!cancelled) {
          setData(result);
        }
      } catch (error) {
        if (!cancelled) {
          setData(null);
          setLoadError(getErrorMessage(error, 'Could not load resources for this type.'));
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
  }, [type.id, page, searchDebounced, filterMode]);

  const totalPages = data?.totalPages ?? 0;
  const totalItems = data?.totalItems ?? 0;
  const canPrev = page > 0;
  const canNext = data != null && page < totalPages - 1;
  const items = data?.items ?? [];
  const slots: Array<PublicCatalogResourceItem | null> = Array.from({ length: ROWS_VISIBLE }, (_, i) => items[i] ?? null);

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--card-shadow)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: TYPE_CARD_MIN_HEIGHT,
        height: '100%',
      }}
    >
      <div style={{ height: 3, background: stripe, flexShrink: 0 }} />

      <div
        style={{
          padding: '12px 14px 10px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 10,
          flexShrink: 0,
          minHeight: HEADER_BLOCK_MIN,
          maxHeight: HEADER_BLOCK_MIN,
          overflow: 'hidden',
        }}
      >
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8.5,
                fontWeight: 600,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              {type.code}
            </span>
            <Chip size="sm" color={getResourceCategoryChipColor(type.category)}>
              {getResourceCategoryLabel(type.category)}
            </Chip>
          </div>
          <h2
            style={{
              margin: '0 0 4px',
              fontFamily: 'var(--font-display)',
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-h)',
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {type.name}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 11.5,
              color: 'var(--text-muted)',
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}
          >
            {type.description?.trim()
              ? type.description
              : 'Active resources in this type are listed below. Sign in to book where marked bookable.'}
          </p>
        </div>
        <Chip size="sm" color="glass" dot style={{ flexShrink: 0 }}>
          {type.activeResourceCount} active
        </Chip>
      </div>

      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 3, flexShrink: 0 }}>
        <div style={{ flex: 1, height: 3, borderRadius: 2, background: stripe, opacity: 0.85 }} />
        <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--border)' }} />
        <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--border)' }} />
      </div>

      <div
        style={{
          padding: '12px 14px 10px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        {loadError && (
          <div style={{ marginBottom: 10 }}>
            <Alert variant="error" title="Could not load resources">
              {loadError}
            </Alert>
          </div>
        )}

        <div style={{ height: SLOTS_BLOCK_HEIGHT, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
          {loading &&
            Array.from({ length: ROWS_VISIBLE }).map((_, i) => (
              <Skeleton key={i} variant="rect" height={ROW_HEIGHT} style={{ borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
            ))}

          {!loading &&
            slots.map((slot, i) =>
              slot ? <ResourceMiniCard key={slot.id} resource={slot} /> : <ResourceRowPlaceholder key={`ph-${type.id}-${page}-${i}`} />,
            )}
        </div>

        <div
          style={{
            marginTop: 'auto',
            paddingTop: 10,
            minHeight: PAGINATION_ROW_MIN,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            borderTop: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {!loading && data
              ? totalItems === 0
                ? 'No resources on this page'
                : `Page ${page + 1} of ${Math.max(1, totalPages)} · ${totalItems.toLocaleString()} match${totalItems === 1 ? '' : 'es'}`
              : '—'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="button"
              variant="subtle"
              size="sm"
              iconLeft={<ChevronLeft size={14} />}
              disabled={!canPrev || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="subtle"
              size="sm"
              iconRight={<ChevronRight size={14} />}
              disabled={!canNext || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PublicResourcesCatalog() {
  const [types, setTypes] = React.useState<PublicCatalogTypeSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchInput, setSearchInput] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [filterMode, setFilterMode] = React.useState<PublicCatalogFilterMode>('ALL');

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 320);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPublicCatalogTypes({
          search: debouncedSearch || undefined,
          filter: filterMode,
        });
        if (!cancelled) {
          setTypes(result);
        }
      } catch (err) {
        if (!cancelled) {
          setTypes([]);
          setError(getErrorMessage(err, 'We could not load the public catalogue.'));
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
  }, [debouncedSearch, filterMode]);

  const totalActiveResources = React.useMemo(
    () => types.reduce((sum, t) => sum + (t.activeResourceCount ?? 0), 0),
    [types],
  );

  return (
    <div style={{ display: 'grid', gap: 48, paddingBottom: 96 }}>
      <section style={{ maxWidth: 1440, margin: '0 auto', width: '100%', padding: '0 clamp(20px, 2.4vw, 36px)' }}>
        <div style={{ display: 'grid', gap: 20, maxWidth: 820, paddingTop: 12 }}>
          <Reveal>
            <Chip color="glass">Campus catalogue</Chip>
          </Reveal>
          <Reveal delay={0.04}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(34px, 5.5vw, 54px)',
                fontWeight: 900,
                letterSpacing: '-0.06em',
                lineHeight: 1.05,
                color: 'var(--text-h)',
                margin: 0,
              }}
            >
              Browse available resources
            </h1>
          </Reveal>
          <Reveal delay={0.08}>
            <p style={{ margin: 0, maxWidth: 720, color: 'var(--text-body)', lineHeight: 1.85, fontSize: 17 }}>
              Explore active spaces and equipment by resource type. Use search to match names, codes, locations, or
              type details. Each card shows five rows per page with consistent layout. Sign in to request a booking for
              bookable items.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <Card style={{ padding: '16px 18px' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 14,
                  alignItems: 'flex-end',
                }}
              >
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <Input
                    id="public-catalog-search"
                    label="Search"
                    placeholder="Search by resource name, code, location, or type…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    iconLeft={<Search size={15} />}
                  />
                </div>
                <div style={{ flex: '0 1 220px', minWidth: 160 }}>
                  <Select
                    id="public-catalog-filter"
                    label="Match"
                    value={filterMode}
                    onChange={(e) => setFilterMode(e.target.value as PublicCatalogFilterMode)}
                    options={[
                      { value: 'ALL', label: 'Types & resources' },
                      { value: 'RESOURCE_TYPES', label: 'Resource types only' },
                      { value: 'RESOURCES', label: 'Resources only' },
                    ]}
                  />
                </div>
              </div>
            </Card>
          </Reveal>
          <Reveal delay={0.12}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <ButtonLink href="/login" variant="glass" iconRight={<CalendarPlus size={16} />}>
                Sign in to book
              </ButtonLink>
              <ButtonLink href="/features" variant="subtle">
                Platform features
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ maxWidth: 1440, margin: '0 auto', width: '100%', padding: '0 clamp(20px, 2.4vw, 36px)' }}>
        {!loading && !error && types.length > 0 && (
          <Reveal>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 14,
                marginBottom: 8,
              }}
            >
              <Card hoverable style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      display: 'grid',
                      placeItems: 'center',
                      background: 'rgba(238,202,68,.12)',
                      color: 'var(--yellow-400)',
                      border: '1px solid rgba(238,202,68,.2)',
                    }}
                  >
                    <Layers size={18} />
                  </div>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 8.5,
                        fontWeight: 700,
                        letterSpacing: '.2em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Resource types
                    </p>
                    <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-h)' }}>
                      {types.length}
                    </p>
                  </div>
                </div>
              </Card>
              <Card hoverable style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      display: 'grid',
                      placeItems: 'center',
                      background: 'rgba(43,109,232,.1)',
                      color: 'var(--blue-400)',
                      border: '1px solid rgba(43,109,232,.2)',
                    }}
                  >
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 8.5,
                        fontWeight: 700,
                        letterSpacing: '.2em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Active listings (this view)
                    </p>
                    <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-h)' }}>
                      {totalActiveResources.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </Reveal>
        )}

        {error && (
          <Alert variant="error" title="Catalogue unavailable">
            {error}
          </Alert>
        )}

        {loading && (
          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
              alignItems: 'stretch',
            }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rect" height={TYPE_CARD_MIN_HEIGHT} style={{ borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        )}

        {!loading && !error && types.length === 0 && (
          <Card style={{ padding: 28, textAlign: 'center' as const }}>
            <p style={{ margin: 0, color: 'var(--text-body)', fontSize: 16, lineHeight: 1.7 }}>
              {debouncedSearch
                ? 'No resource types matched your search. Try different keywords or switch the match filter.'
                : 'There are no active resources published in the catalogue yet. Check back later or sign in for the full workspace.'}
            </p>
            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              <ButtonLink href="/login" variant="primary">
                Sign in
              </ButtonLink>
            </div>
          </Card>
        )}

        {!loading && !error && types.length > 0 && (
          <div
            style={{
              display: 'grid',
              gap: 22,
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
              alignItems: 'stretch',
            }}
          >
            {types.map((type, index) => (
              <Reveal key={type.id} delay={Math.min(0.06 * index, 0.36)}>
                <ResourceTypeCatalogCard type={type} searchDebounced={debouncedSearch} filterMode={filterMode} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section style={{ maxWidth: 820, margin: '0 auto', padding: '0 clamp(20px, 2.4vw, 36px)' }}>
        <Reveal>
          <Card style={{ padding: '22px 24px', borderStyle: 'dashed' as const }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.75 }}>
              <strong style={{ color: 'var(--text-h)' }}>Need to book or report an issue?</strong> Public browsing is
              read-only. After you sign in, you can submit booking requests for bookable resources and open support
              tickets from your workspace.
            </p>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}
