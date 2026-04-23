'use client';

import React from 'react';
import { Boxes, Pencil, Plus, Search, Trash2 } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { ResourceTypeFormModal } from '@/components/screens/catalogue/resource-types/ResourceTypeFormModal';
import { Alert, Button, Card, Chip, IconButton, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import {
  createCatalogueResourceType,
  deleteCatalogueResourceType,
  getErrorMessage,
  listCatalogueResourceTypes,
  updateCatalogueResourceType,
} from '@/lib/api-client';
import type {
  CatalogueResourceTypeResponse,
  CreateResourceTypeRequest,
  ResourceCategory,
  UpdateResourceTypeRequest,
} from '@/lib/api-types';
import { getResourceCategoryChipColor, getResourceCategoryLabel, resourceCategoryOptions } from '@/lib/resource-display';

type FlagChip = {
  label: string;
  color: 'yellow' | 'red' | 'green' | 'blue' | 'orange' | 'neutral' | 'glass';
};

function getResourceTypeFlagChips(resourceType: CatalogueResourceTypeResponse): FlagChip[] {
  const chips: FlagChip[] = [
    {
      label: resourceType.isBookableDefault ? 'Bookable default' : 'Not bookable',
      color: resourceType.isBookableDefault ? 'green' : 'neutral',
    },
    {
      label: resourceType.isMovableDefault ? 'Movable default' : 'Fixed default',
      color: resourceType.isMovableDefault ? 'blue' : 'neutral',
    },
    {
      label: resourceType.capacityRequired
        ? 'Capacity required'
        : resourceType.capacityEnabled
          ? 'Capacity enabled'
          : 'No capacity',
      color: resourceType.capacityRequired ? 'orange' : resourceType.capacityEnabled ? 'blue' : 'neutral',
    },
  ];

  if (resourceType.locationRequired) {
    chips.push({ label: 'Location required', color: 'yellow' });
  }

  if (resourceType.featuresEnabled) {
    chips.push({ label: 'Features', color: 'glass' });
  }

  return chips;
}

export function CatalogueResourceTypesScreen({
  embedded = false,
  addOpen,
  onAddOpenChange,
}: {
  embedded?: boolean;
  addOpen?: boolean;
  onAddOpenChange?: (open: boolean) => void;
}) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.access_token ?? null;

  const [resourceTypes, setResourceTypes] = React.useState<CatalogueResourceTypeResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [internalFormOpen, setInternalFormOpen] = React.useState(false);
  const [editingResourceType, setEditingResourceType] = React.useState<CatalogueResourceTypeResponse | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');

  const deferredSearch = React.useDeferredValue(searchText);
  const isControlled = onAddOpenChange !== undefined;
  const formOpen = isControlled ? (addOpen ?? false) : internalFormOpen;

  function setFormOpen(open: boolean) {
    if (isControlled) onAddOpenChange?.(open);
    else setInternalFormOpen(open);
  }

  const reloadResourceTypes = React.useCallback(async () => {
    if (!accessToken) {
      setLoadError('Your session is unavailable. Please sign in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const nextResourceTypes = await listCatalogueResourceTypes(accessToken);
      setResourceTypes(nextResourceTypes);
    } catch (error) {
      setResourceTypes([]);
      setLoadError(getErrorMessage(error, 'We could not load resource types.'));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void reloadResourceTypes();
  }, [reloadResourceTypes]);

  const filteredResourceTypes = React.useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return resourceTypes.filter((resourceType) => {
      if (needle) {
        const haystack = [
          resourceType.code,
          resourceType.name,
          resourceType.category,
          resourceType.description,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      if (categoryFilter && resourceType.category !== categoryFilter) return false;
      return true;
    });
  }, [categoryFilter, deferredSearch, resourceTypes]);

  async function handleSave(payload: CreateResourceTypeRequest | UpdateResourceTypeRequest) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    setSaving(true);
    try {
      if (editingResourceType) {
        await updateCatalogueResourceType(accessToken, editingResourceType.id, payload as UpdateResourceTypeRequest);
        showToast('success', 'Resource type updated', `${editingResourceType.name} was updated.`);
      } else {
        await createCatalogueResourceType(accessToken, payload as CreateResourceTypeRequest);
        showToast('success', 'Resource type created', 'Resource type added to the catalogue.');
      }

      setFormOpen(false);
      setEditingResourceType(null);
      await reloadResourceTypes();
    } catch (error) {
      showToast('error', 'Save failed', getErrorMessage(error, 'We could not save the resource type.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(resourceType: CatalogueResourceTypeResponse) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    const confirmed = window.confirm(`Remove ${resourceType.name}? Resource types assigned to resources cannot be removed.`);
    if (!confirmed) return;

    setDeletingId(resourceType.id);
    try {
      await deleteCatalogueResourceType(accessToken, resourceType.id);
      showToast('success', 'Resource type removed', `${resourceType.name} was removed.`);
      await reloadResourceTypes();
    } catch (error) {
      showToast('error', 'Remove failed', getErrorMessage(error, 'We could not remove the resource type.'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: embedded ? 16 : 28 }}>
      {!embedded && (
        <div>
          <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Catalogue Control
          </p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, lineHeight: 1.1, color: 'var(--text-h)' }}>
            Resource Types
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
            Manage reusable type definitions that resources inherit from.
          </p>
        </div>
      )}

      <Card>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Boxes size={18} />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800 }}>
                  {embedded ? 'Resource Type Management' : 'Resource Types'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  Maintain reusable catalogue type records used by the normalized resource model.
                </div>
              </div>
            </div>
            {!isControlled && (
              <Button
                variant="glass"
                size="sm"
                iconLeft={<Plus size={14} />}
                onClick={() => {
                  setEditingResourceType(null);
                  setFormOpen(true);
                }}
              >
                Add Resource Type
              </Button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <Input
              label="Search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search code, name, category..."
              iconLeft={<Search size={15} />}
            />
            <Select
              label="Category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              options={[{ value: '', label: 'All categories' }, ...resourceCategoryOptions]}
            />
          </div>

          {loadError && <Alert variant="error" title="Could not load resource types">{loadError}</Alert>}

          <ResourceTypeFormModal
            open={formOpen}
            title={editingResourceType ? `Edit ${editingResourceType.name}` : 'Add Resource Type'}
            resourceType={editingResourceType}
            submitting={saving}
            onClose={() => {
              setFormOpen(false);
              setEditingResourceType(null);
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
                  <TableHeader>Flags</TableHeader>
                  <TableHeader style={{ textAlign: 'right' }}>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>Loading resource types…</TableCell>
                  </TableRow>
                ) : filteredResourceTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>No resource types match the current filters.</TableCell>
                  </TableRow>
                ) : (
                  filteredResourceTypes.map((resourceType) => (
                    <TableRow key={resourceType.id}>
                      <TableCell><strong>{resourceType.code}</strong></TableCell>
                      <TableCell>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <span>{resourceType.name}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {resourceType.description ?? 'No description'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip color={getResourceCategoryChipColor(resourceType.category as ResourceCategory)}>
                          {getResourceCategoryLabel(resourceType.category as ResourceCategory)}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {getResourceTypeFlagChips(resourceType).map((chip) => (
                            <Chip key={`${resourceType.id}-${chip.label}`} color={chip.color}>
                              {chip.label}
                            </Chip>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4, justifyContent: 'flex-end' }}>
                          <IconButton
                            variant="neutral"
                            icon={<Pencil size={13} />}
                            title="Edit resource type"
                            aria-label={`Edit ${resourceType.name}`}
                            onClick={() => {
                              setEditingResourceType(resourceType);
                              setFormOpen(true);
                            }}
                          />
                          <IconButton
                            variant="danger"
                            icon={<Trash2 size={13} />}
                            title="Delete resource type"
                            aria-label={`Delete ${resourceType.name}`}
                            loading={deletingId === resourceType.id}
                            onClick={() => void handleDelete(resourceType)}
                          />
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
