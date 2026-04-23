'use client';

import React from 'react';
import { CircleSlash, FolderOpen, Pencil, Plus, Search } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert, Button, Card, Chip, IconButton, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import {
  createResource,
  deleteResource,
  getResource,
  getErrorMessage,
  getResourceLookups,
  getResourceStats,
  listResourcePage,
  updateResource,
} from '@/lib/api-client';
import type {
  CreateResourceRequest,
  LocationOption,
  ManagedByRoleOption,
  ResourceFeatureOption,
  ResourceListItem,
  ResourceListPage,
  ResourceResponse,
  ResourceStats,
  ResourceTypeOption,
  UpdateResourceRequest,
} from '@/lib/api-types';
import {
  getResourceCategoryChipColor,
  getResourceCategoryLabel,
  getResourceStatusChipColor,
  getResourceStatusLabel,
  resourceAvailabilityLabel,
  resourceCategoryOptions,
  resourceStatusOptions,
} from '@/lib/resource-display';
import { ResourceFormModal } from '@/components/screens/admin/resources/ResourceFormModal';

const RESOURCE_PAGE_SIZE = 50;

export function AdminResourcesScreen({
  embedded = false,
  addOpen,
  onAddOpenChange,
  onResourcesChanged,
}: {
  embedded?: boolean;
  addOpen?: boolean;
  onAddOpenChange?: (open: boolean) => void;
  onResourcesChanged?: () => void;
}) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.access_token ?? null;

  const [resources, setResources] = React.useState<ResourceListItem[]>([]);
  const [resourcePage, setResourcePage] = React.useState<ResourceListPage | null>(null);
  const [stats, setStats] = React.useState<ResourceStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = React.useState(true);
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const [resourceTypeOptions, setResourceTypeOptions] = React.useState<ResourceTypeOption[]>([]);
  const [locationOptions, setLocationOptions] = React.useState<LocationOption[]>([]);
  const [featureOptions, setFeatureOptions] = React.useState<ResourceFeatureOption[]>([]);
  const [managedByRoleOptions, setManagedByRoleOptions] = React.useState<ManagedByRoleOption[]>([]);
  const [searchText, setSearchText] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [internalFormOpen, setInternalFormOpen] = React.useState(false);
  const [editingResource, setEditingResource] = React.useState<ResourceResponse | null>(null);
  const isControlled = onAddOpenChange !== undefined;
  const formOpen = isControlled ? (addOpen ?? false) : internalFormOpen;
  function setFormOpen(open: boolean) {
    if (isControlled) onAddOpenChange?.(open);
    else setInternalFormOpen(open);
  }
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);

  const deferredSearch = React.useDeferredValue(searchText);

  React.useEffect(() => {
    setPage(0);
  }, [categoryFilter, deferredSearch, statusFilter]);

  const reloadResources = React.useCallback(async () => {
    if (!accessToken) {
      setLoadError('Your session is unavailable. Please sign in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const nextPage = await listResourcePage(accessToken, {
        search: deferredSearch,
        category: categoryFilter,
        status: statusFilter,
        page,
        size: RESOURCE_PAGE_SIZE,
      });
      setResourcePage(nextPage);
      setResources(nextPage.items);
    } catch (error) {
      setResources([]);
      setResourcePage(null);
      setLoadError(getErrorMessage(error, 'We could not load resources.'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, categoryFilter, deferredSearch, page, statusFilter]);

  const loadStats = React.useCallback(async () => {
    if (!accessToken || embedded) {
      return;
    }

    try {
      setStats(await getResourceStats(accessToken));
    } catch {
      setStats(null);
    }
  }, [accessToken, embedded]);

  const loadLookups = React.useCallback(async () => {
    if (!accessToken) {
      setLookupError('Your session is unavailable. Please sign in again.');
      setLookupLoading(false);
      return;
    }

    setLookupLoading(true);
    setLookupError(null);

    try {
      const lookups = await getResourceLookups(accessToken);

      setResourceTypeOptions(lookups.types);
      setLocationOptions(lookups.locations);
      setFeatureOptions(lookups.features);
      setManagedByRoleOptions(lookups.managedRoles);
    } catch (error) {
      setLookupError(getErrorMessage(error, 'We could not load catalogue lookup data.'));
      setResourceTypeOptions([]);
      setLocationOptions([]);
      setFeatureOptions([]);
      setManagedByRoleOptions([]);
    } finally {
      setLookupLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void reloadResources();
  }, [reloadResources]);

  React.useEffect(() => {
    void loadStats();
  }, [loadStats]);

  React.useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  async function handleSave(payload: CreateResourceRequest | UpdateResourceRequest) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    setSaving(true);
    try {
      if (editingResource) {
        await updateResource(accessToken, editingResource.id, payload as UpdateResourceRequest);
        showToast('success', 'Resource updated', `${editingResource.code} was updated.`);
      } else {
        await createResource(accessToken, payload as CreateResourceRequest);
        showToast('success', 'Resource created', 'Resource added to the catalogue.');
      }

      setFormOpen(false);
      setEditingResource(null);
      await Promise.all([reloadResources(), loadStats()]);
      onResourcesChanged?.();
    } catch (error) {
      showToast('error', 'Save failed', getErrorMessage(error, 'We could not save the resource.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(resource: ResourceListItem) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    const confirmed = window.confirm(`Deactivate ${resource.code}? This keeps the record but marks it inactive.`);
    if (!confirmed) return;

    setDeletingId(resource.id);
    try {
      await deleteResource(accessToken, resource.id);
      showToast('success', 'Resource removed', `${resource.code} is now inactive.`);
      await Promise.all([reloadResources(), loadStats()]);
      onResourcesChanged?.();
    } catch (error) {
      showToast('error', 'Delete failed', getErrorMessage(error, 'We could not remove the resource.'));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleEdit(resource: ResourceListItem) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    setEditingId(resource.id);
    try {
      setEditingResource(await getResource(accessToken, resource.id));
      setFormOpen(true);
    } catch (error) {
      showToast('error', 'Load failed', getErrorMessage(error, 'We could not load this resource.'));
    } finally {
      setEditingId(null);
    }
  }

  const totalResources = stats?.totalResources ?? resourcePage?.totalItems ?? resources.length;
  const activeResources = stats?.activeResources ?? 0;
  const maintenanceResources = stats?.maintenanceResources ?? 0;
  const outOfServiceResources = stats?.outOfServiceResources ?? 0;
  const pageStart = resourcePage && resourcePage.totalItems > 0
    ? resourcePage.page * resourcePage.size + 1
    : 0;
  const pageEnd = resourcePage
    ? Math.min((resourcePage.page + 1) * resourcePage.size, resourcePage.totalItems)
    : resources.length;

  return (
    <div style={{ display: 'grid', gap: embedded ? 16 : 28 }}>
      {!embedded && (
        <>
          <div>
            <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Operations Console
            </p>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, lineHeight: 1.1, color: 'var(--text-h)' }}>
              Resource Catalogue
            </h1>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
              Manage spaces, equipment, and transport entries used across bookings.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <Card hoverable>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{totalResources}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Total resources</div>
            </Card>
            <Card hoverable>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{activeResources}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Active resources</div>
            </Card>
            <Card hoverable>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{maintenanceResources}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>In maintenance</div>
            </Card>
            <Card hoverable>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{outOfServiceResources}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Out of service</div>
            </Card>
          </div>
        </>
      )}

      <Card>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FolderOpen size={18} />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800 }}>
                  {embedded ? 'Resource Management' : 'Catalogue'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  Search, filter, and manage resources using the normalized catalogue model.
                </div>
              </div>
            </div>
            {!isControlled && (
              <Button
                variant="glass"
                size="sm"
                iconLeft={<Plus size={14} />}
                onClick={() => {
                  setEditingResource(null);
                  setFormOpen(true);
                }}
              >
                Add Resource
              </Button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <Input
              label="Search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search code, name, type, location..."
              iconLeft={<Search size={15} />}
            />
            <Select
              label="Category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              options={[{ value: '', label: 'All categories' }, ...resourceCategoryOptions]}
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[{ value: '', label: 'All statuses' }, ...resourceStatusOptions]}
            />
          </div>

          {loadError && <Alert variant="error" title="Could not load resources">{loadError}</Alert>}
          {lookupError && !formOpen && <Alert variant="error" title="Lookup data unavailable">{lookupError}</Alert>}

          <ResourceFormModal
            open={formOpen}
            title={editingResource ? `Edit ${editingResource.code}` : 'Add Resource'}
            resource={editingResource}
            submitting={saving}
            resourceTypeOptions={resourceTypeOptions}
            locationOptions={locationOptions}
            featureOptions={featureOptions}
            managedByRoleOptions={managedByRoleOptions}
            lookupsLoading={lookupLoading}
            lookupError={lookupError}
            onClose={() => {
              setFormOpen(false);
              setEditingResource(null);
            }}
            onSubmit={async (payload) => {
              await handleSave(payload);
            }}
          />

          <div style={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Code</TableHeader>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Location</TableHeader>
                  <TableHeader>Availability</TableHeader>
                  <TableHeader style={{ textAlign: 'right' }}>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>Loading resources…</TableCell>
                  </TableRow>
                ) : resources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>No resources match the current filters.</TableCell>
                  </TableRow>
                ) : (
                  resources.map((resource) => {
                    const category = resource.category;
                    const location = resource.locationName ?? resource.location;
                    const resourceTypeName = resource.resourceTypeName ?? resource.subcategory;

                    return (
                      <TableRow key={resource.id}>
                        <TableCell><strong>{resource.code}</strong></TableCell>
                        <TableCell>
                          <div style={{ display: 'grid', gap: 2 }}>
                            <span>{resource.name}</span>
                            {resourceTypeName && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{resourceTypeName}</span>}
                            {resource.description && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{resource.description}</span>}
                          </div>
                        </TableCell>
                        <TableCell><Chip color={getResourceCategoryChipColor(category)}>{getResourceCategoryLabel(category)}</Chip></TableCell>
                        <TableCell><Chip color={getResourceStatusChipColor(resource.status)}>{getResourceStatusLabel(resource.status)}</Chip></TableCell>
                        <TableCell>{location ?? '—'}</TableCell>
                        <TableCell>{resourceAvailabilityLabel(resource)}</TableCell>
                        <TableCell style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 4, justifyContent: 'flex-end' }}>
                            <IconButton
                              variant="neutral"
                              icon={<Pencil size={13} />}
                              title="Edit resource"
                              aria-label={`Edit ${resource.code}`}
                              loading={editingId === resource.id}
                              onClick={() => void handleEdit(resource)}
                            />
                            <IconButton
                              variant="warning"
                              icon={<CircleSlash size={13} />}
                              title="Deactivate resource"
                              aria-label={`Deactivate ${resource.code}`}
                              loading={deletingId === resource.id}
                              onClick={() => void handleDelete(resource)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {resourcePage && resourcePage.totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Showing {pageStart}-{pageEnd} of {resourcePage.totalItems}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="subtle"
                  size="xs"
                  disabled={resourcePage.page <= 0 || loading}
                  onClick={() => setPage((current) => Math.max(current - 1, 0))}
                >
                  Previous
                </Button>
                <Button
                  variant="subtle"
                  size="xs"
                  disabled={resourcePage.page >= resourcePage.totalPages - 1 || loading}
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
