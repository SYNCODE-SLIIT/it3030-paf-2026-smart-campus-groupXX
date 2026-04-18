'use client';

import React from 'react';
import { FolderOpen, Plus, Search } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { createResource, deleteResource, getErrorMessage, listResources, updateResource } from '@/lib/api-client';
import type { CreateResourceRequest, ResourceResponse, UpdateResourceRequest } from '@/lib/api-types';
import { getResourceCategoryChipColor, getResourceCategoryLabel, getResourceStatusChipColor, getResourceStatusLabel, resourceAvailabilityLabel, resourceCategoryOptions, resourceStatusOptions } from '@/lib/resource-display';
import { ResourceFormModal } from '@/components/screens/admin/resources/ResourceFormModal';

type NoticeState = {
  variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
  title: string;
  message: string;
} | null;

export function AdminResourcesScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;

  const [resources, setResources] = React.useState<ResourceResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<NoticeState>(null);
  const [searchText, setSearchText] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingResource, setEditingResource] = React.useState<ResourceResponse | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const deferredSearch = React.useDeferredValue(searchText);

  const reload = React.useCallback(async () => {
    if (!accessToken) {
      setLoadError('The admin session is unavailable. Please sign in again.');
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

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const filteredResources = React.useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return resources.filter((resource) => {
      if (needle) {
        const haystack = [resource.code, resource.name, resource.description, resource.location, resource.subcategory]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (categoryFilter && resource.category !== categoryFilter) return false;
      if (statusFilter && resource.status !== statusFilter) return false;
      return true;
    });
  }, [categoryFilter, deferredSearch, resources, statusFilter]);

  async function handleSave(payload: CreateResourceRequest | UpdateResourceRequest) {
    if (!accessToken) {
      setNotice({ variant: 'error', title: 'Session unavailable', message: 'Please sign in again.' });
      return;
    }

    setSaving(true);
    try {
      if (editingResource) {
        await updateResource(accessToken, editingResource.id, payload as UpdateResourceRequest);
        setNotice({ variant: 'success', title: 'Resource updated', message: `${editingResource.code} was updated.` });
      } else {
        await createResource(accessToken, payload as CreateResourceRequest);
        setNotice({ variant: 'success', title: 'Resource created', message: 'Resource added to the catalogue.' });
      }
      setFormOpen(false);
      setEditingResource(null);
      await reload();
    } catch (error) {
      setNotice({ variant: 'error', title: 'Save failed', message: getErrorMessage(error, 'We could not save the resource.') });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(resource: ResourceResponse) {
    if (!accessToken) {
      setNotice({ variant: 'error', title: 'Session unavailable', message: 'Please sign in again.' });
      return;
    }

    const confirmed = window.confirm(`Deactivate ${resource.code}? This keeps the record but marks it inactive.`);
    if (!confirmed) return;

    setDeletingId(resource.id);
    try {
      await deleteResource(accessToken, resource.id);
      setNotice({ variant: 'success', title: 'Resource removed', message: `${resource.code} is now inactive.` });
      await reload();
    } catch (error) {
      setNotice({ variant: 'error', title: 'Delete failed', message: getErrorMessage(error, 'We could not remove the resource.') });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 28 }}>
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

      {notice && (
        <Alert variant={notice.variant} title={notice.title}>
          {notice.message}
        </Alert>
      )}

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

      <Card>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FolderOpen size={18} />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800 }}>Catalogue</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Search, filter, and manage resources.</div>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) repeat(2, minmax(160px, 220px))', gap: 12 }}>
            <Input label="Search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search code, name, location..." iconLeft={<Search size={15} />} />
            <Select label="Category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} options={[{ value: '', label: 'All categories' }, ...resourceCategoryOptions]} />
            <Select label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} options={[{ value: '', label: 'All statuses' }, ...resourceStatusOptions]} />
          </div>

          {loadError && <Alert variant="error" title="Could not load resources">{loadError}</Alert>}

          {formOpen && (
            <ResourceFormModal
              title={editingResource ? `Edit ${editingResource.code}` : 'Add Resource'}
              resource={editingResource}
              submitting={saving}
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
                  filteredResources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell><strong>{resource.code}</strong></TableCell>
                      <TableCell>
                        <div style={{ display: 'grid' }}>
                          <span>{resource.name}</span>
                          {resource.description && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{resource.description}</span>}
                        </div>
                      </TableCell>
                      <TableCell><Chip color={getResourceCategoryChipColor(resource.category)}>{getResourceCategoryLabel(resource.category)}</Chip></TableCell>
                      <TableCell><Chip color={getResourceStatusChipColor(resource.status)}>{getResourceStatusLabel(resource.status)}</Chip></TableCell>
                      <TableCell>{resource.location ?? '—'}</TableCell>
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
}