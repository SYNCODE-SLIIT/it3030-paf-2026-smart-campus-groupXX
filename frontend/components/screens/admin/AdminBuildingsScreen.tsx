'use client';

import React from 'react';
import { Building2, CircleSlash, Pencil, Plus, Search } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { BuildingFormModal } from '@/components/screens/admin/buildings/BuildingFormModal';
import { Alert, Button, Card, Chip, IconButton, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { createBuilding, deactivateBuilding, getErrorMessage, listBuildings, updateBuilding } from '@/lib/api-client';
import { buildingTypeOptions, getBuildingLayoutLabel, getBuildingTypeChipColor, getBuildingTypeLabel } from '@/lib/building-display';
import type { BuildingResponse, CreateBuildingRequest, UpdateBuildingRequest } from '@/lib/api-types';

export function AdminBuildingsScreen() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.access_token ?? null;

  const [buildings, setBuildings] = React.useState<BuildingResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingBuilding, setEditingBuilding] = React.useState<BuildingResponse | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deactivatingId, setDeactivatingId] = React.useState<string | null>(null);

  const deferredSearch = React.useDeferredValue(searchText);

  const reloadBuildings = React.useCallback(async () => {
    if (!accessToken) {
      setLoadError('The admin session is unavailable. Please sign in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const nextBuildings = await listBuildings(accessToken);
      setBuildings(nextBuildings);
    } catch (error) {
      setBuildings([]);
      setLoadError(getErrorMessage(error, 'We could not load buildings.'));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void reloadBuildings();
  }, [reloadBuildings]);

  const filteredBuildings = React.useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return buildings.filter((building) => {
      if (needle) {
        const haystack = [
          building.buildingName,
          building.buildingCode,
          building.description,
          building.leftWingPrefix,
          building.rightWingPrefix,
          building.defaultPrefix,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      if (typeFilter && building.buildingType !== typeFilter) return false;
      if (statusFilter) {
        const matchesActive = statusFilter === 'ACTIVE' ? building.isActive : !building.isActive;
        if (!matchesActive) return false;
      }
      return true;
    });
  }, [buildings, deferredSearch, statusFilter, typeFilter]);

  async function handleSave(payload: CreateBuildingRequest | UpdateBuildingRequest) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    setSaving(true);
    try {
      if (editingBuilding) {
        await updateBuilding(accessToken, editingBuilding.id, payload as UpdateBuildingRequest);
        showToast('success', 'Building updated', `${editingBuilding.buildingName} was updated.`);
      } else {
        await createBuilding(accessToken, payload as CreateBuildingRequest);
        showToast('success', 'Building created', 'Building added to the system catalogue.');
      }

      setFormOpen(false);
      setEditingBuilding(null);
      await reloadBuildings();
    } catch (error) {
      showToast('error', 'Save failed', getErrorMessage(error, 'We could not save the building.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(building: BuildingResponse) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    const confirmed = window.confirm(`Deactivate ${building.buildingName}? Existing references are kept, but the building will be marked inactive.`);
    if (!confirmed) return;

    setDeactivatingId(building.id);
    try {
      await deactivateBuilding(accessToken, building.id);
      showToast('success', 'Building deactivated', `${building.buildingName} is now inactive.`);
      await reloadBuildings();
    } catch (error) {
      showToast('error', 'Deactivate failed', getErrorMessage(error, 'We could not deactivate the building.'));
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      <div>
        <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          System Console
        </p>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, lineHeight: 1.1, color: 'var(--text-h)' }}>
          Buildings Management
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
          Manage building records used by the normalized location and catalogue model.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <Card hoverable>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{buildings.length}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Total buildings</div>
        </Card>
        <Card hoverable>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{buildings.filter((item) => item.isActive).length}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Active buildings</div>
        </Card>
        <Card hoverable>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{buildings.filter((item) => item.hasWings).length}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Wing-based buildings</div>
        </Card>
        <Card hoverable>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{buildings.filter((item) => item.buildingType === 'OUTDOOR').length}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Outdoor records</div>
        </Card>
      </div>

      <Card>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Building2 size={18} />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800 }}>Buildings</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Search, maintain, and deactivate building records.</div>
              </div>
            </div>
            <Button
              variant="glass"
              size="sm"
              iconLeft={<Plus size={14} />}
              onClick={() => {
                setEditingBuilding(null);
                setFormOpen(true);
              }}
            >
              Add Building
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <Input
              label="Search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search name, code, prefix..."
              iconLeft={<Search size={15} />}
            />
            <Select
              label="Building Type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              options={[{ value: '', label: 'All types' }, ...buildingTypeOptions]}
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
          </div>

          {loadError && <Alert variant="error" title="Could not load buildings">{loadError}</Alert>}

          <BuildingFormModal
            open={formOpen}
            title={editingBuilding ? `Edit ${editingBuilding.buildingName}` : 'Add Building'}
            building={editingBuilding}
            submitting={saving}
            onClose={() => {
              setFormOpen(false);
              setEditingBuilding(null);
            }}
            onSubmit={async (payload) => {
              await handleSave(payload);
            }}
          />

          <div style={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Code</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Layout</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader style={{ textAlign: 'right' }}>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>Loading buildings…</TableCell>
                  </TableRow>
                ) : filteredBuildings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>No buildings match the current filters.</TableCell>
                  </TableRow>
                ) : (
                  filteredBuildings.map((building) => (
                    <TableRow key={building.id}>
                      <TableCell>
                        <div style={{ display: 'grid', gap: 2 }}>
                          <span>{building.buildingName}</span>
                          {building.description && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{building.description}</span>}
                        </div>
                      </TableCell>
                      <TableCell><strong>{building.buildingCode}</strong></TableCell>
                      <TableCell><Chip color={getBuildingTypeChipColor(building.buildingType)}>{getBuildingTypeLabel(building.buildingType)}</Chip></TableCell>
                      <TableCell>{getBuildingLayoutLabel(building)}</TableCell>
                      <TableCell>
                        <Chip color={building.isActive ? 'green' : 'neutral'}>
                          {building.isActive ? 'Active' : 'Inactive'}
                        </Chip>
                      </TableCell>
                      <TableCell style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4, justifyContent: 'flex-end' }}>
                          <IconButton
                            variant="neutral"
                            icon={<Pencil size={13} />}
                            title="Edit building"
                            aria-label={`Edit ${building.buildingName}`}
                            onClick={() => {
                              setEditingBuilding(building);
                              setFormOpen(true);
                            }}
                          />
                          <IconButton
                            variant="warning"
                            icon={<CircleSlash size={13} />}
                            title={building.isActive ? 'Deactivate building' : 'Building already inactive'}
                            aria-label={`Deactivate ${building.buildingName}`}
                            disabled={!building.isActive}
                            loading={deactivatingId === building.id}
                            onClick={() => void handleDeactivate(building)}
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
