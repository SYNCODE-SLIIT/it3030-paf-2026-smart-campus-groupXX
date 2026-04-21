'use client';

import React from 'react';
import { FolderOpen, Plus, Search } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert, Button, Card, Chip, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import {
  createResource,
  deleteResource,
  getErrorMessage,
  listLocationOptions,
  listManagedByRoleOptions,
  listResourceFeatureOptions,
  listResources,
  listResourceTypeOptions,
  updateResource,
} from '@/lib/api-client';
import type {
  CreateResourceRequest,
  LocationOption,
  ManagedByRoleOption,
  ResourceFeatureOption,
  ResourceResponse,
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

export function AdminResourcesScreen({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.access_token ?? null;

  const [resources, setResources] = React.useState<ResourceResponse[]>([]);
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
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingResource, setEditingResource] = React.useState<ResourceResponse | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const deferredSearch = React.useDeferredValue(searchText);

  const reloadResources = React.useCallback(async () => {
    if (!accessToken) {
      setLoadError('Your session is unavailable. Please sign in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const nextResources = await listResources(accessToken);
      setResources(nextResources);
    } catch (error) {
      setResources([]);
      setLoadError(getErrorMessage(error, 'We could not load resources.'));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const loadLookups = React.useCallback(async () => {
    if (!accessToken) {
      setLookupError('Your session is unavailable. Please sign in again.');
      setLookupLoading(false);
      return;
    }

    setLookupLoading(true);
    setLookupError(null);

    try {
      const [types, locations, features, managedRoles] = await Promise.all([
        listResourceTypeOptions(accessToken),
        listLocationOptions(accessToken),
        listResourceFeatureOptions(accessToken),
        listManagedByRoleOptions(accessToken),
      ]);

      setResourceTypeOptions(types);
      setLocationOptions(locations);
      setFeatureOptions(features);
      setManagedByRoleOptions(managedRoles);
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
    void loadLookups();
  }, [loadLookups]);

  const filteredResources = React.useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return resources.filter((resource) => {
      const normalizedCategory = resource.resourceType?.category ?? resource.category;
      const normalizedLocation = resource.locationDetails?.locationName ?? resource.location;

      if (needle) {
        const haystack = [
          resource.code,
          resource.name,
          resource.description,
          normalizedLocation,
          resource.subcategory,
          resource.resourceType?.name,
          ...(resource.features ?? []).map((feature) => feature.name),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(needle)) return false;
      }

      if (categoryFilter && normalizedCategory !== categoryFilter) return false;
      if (statusFilter && resource.status !== statusFilter) return false;
      return true;
    });
  }, [categoryFilter, deferredSearch, resources, statusFilter]);

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
      await reloadResources();
    } catch (error) {
      showToast('error', 'Save failed', getErrorMessage(error, 'We could not save the resource.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(resource: ResourceResponse) {
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
      await reloadResources();
    } catch (error) {
      showToast('error', 'Delete failed', getErrorMessage(error, 'We could not remove the resource.'));
    } finally {
      setDeletingId(null);
    }
  }

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
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{resources.length}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Total resources</div>
            </Card>
            <Card hoverable>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{resources.filter((item) => item.status === 'ACTIVE').length}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Active resources</div>
            </Card>
            <Card hoverable>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{resources.filter((item) => item.status === 'MAINTENANCE').length}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>In maintenance</div>
            </Card>
            <Card hoverable>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{resources.filter((item) => item.status === 'OUT_OF_SERVICE').length}</div>
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

          {formOpen && (
            <ResourceFormModal
              title={editingResource ? `Edit ${editingResource.code}` : 'Add Resource'}
              resource={editingResource}
              submitting={saving}
              resourceTypeOptions={resourceTypeOptions}
              locationOptions={locationOptions}
              featureOptions={featureOptions}
              managedByRoleOptions={managedByRoleOptions}
              lookupsLoading={lookupLoading}
              lookupError={lookupError}
              onCancel={() => {
                setFormOpen(false);
                setEditingResource(null);
              }}
              onSubmit={async (payload) => {
                await handleSave(payload);
              }}
            />
          )}

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
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>Loading resources…</TableCell>
                  </TableRow>
                ) : filteredResources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>No resources match the current filters.</TableCell>
                  </TableRow>
                ) : (
                  filteredResources.map((resource) => {
                    const category = resource.resourceType?.category ?? resource.category;
                    const location = resource.locationDetails?.locationName ?? resource.location;
                    const resourceTypeName = resource.resourceType?.name ?? resource.subcategory;

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
                        <TableCell>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <Button
                              size="xs"
                              variant="subtle"
                              onClick={() => {
                                setEditingResource(resource);
                                setFormOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button size="xs" variant="danger" loading={deletingId === resource.id} onClick={() => void handleDelete(resource)}>
                              Deactivate
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
}
