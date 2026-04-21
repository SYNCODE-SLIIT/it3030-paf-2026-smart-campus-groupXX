'use client';

import React from 'react';
import { MapPinned, Plus, Search } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { LocationFormModal } from '@/components/screens/catalogue/locations/LocationFormModal';
import { Alert, Button, Card, Chip, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import {
  createCatalogueLocation,
  deleteCatalogueLocation,
  getErrorMessage,
  listCatalogueBuildings,
  listCatalogueLocations,
  updateCatalogueLocation,
} from '@/lib/api-client';
import type {
  BuildingResponse,
  CatalogueLocationResponse,
  CreateLocationRequest,
  LocationType,
  UpdateLocationRequest,
} from '@/lib/api-types';
import { formatBuildingOptionLabel, getLocationTypeLabel, getWingLabel, locationTypeOptions } from '@/lib/location-display';

export function CatalogueLocationsScreen({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.access_token ?? null;

  const [locations, setLocations] = React.useState<CatalogueLocationResponse[]>([]);
  const [buildings, setBuildings] = React.useState<BuildingResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingLocation, setEditingLocation] = React.useState<CatalogueLocationResponse | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState('');
  const [buildingFilter, setBuildingFilter] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');

  const deferredSearch = React.useDeferredValue(searchText);

  const reloadData = React.useCallback(async () => {
    if (!accessToken) {
      setLoadError('Your session is unavailable. Please sign in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const [nextLocations, nextBuildings] = await Promise.all([
        listCatalogueLocations(accessToken),
        listCatalogueBuildings(accessToken),
      ]);
      setLocations(nextLocations);
      setBuildings(nextBuildings);
    } catch (error) {
      setLocations([]);
      setBuildings([]);
      setLoadError(getErrorMessage(error, 'We could not load locations.'));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void reloadData();
  }, [reloadData]);

  const filteredLocations = React.useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return locations.filter((location) => {
      if (needle) {
        const haystack = [
          location.locationName,
          location.buildingName,
          location.buildingCode,
          location.roomCode,
          location.floor,
          location.description,
          location.locationType,
          location.wing,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      if (buildingFilter && location.buildingId !== buildingFilter) return false;
      if (typeFilter && location.locationType !== typeFilter) return false;
      return true;
    });
  }, [buildingFilter, deferredSearch, locations, typeFilter]);

  async function handleSave(payload: CreateLocationRequest | UpdateLocationRequest) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    setSaving(true);
    try {
      if (editingLocation) {
        await updateCatalogueLocation(accessToken, editingLocation.id, payload as UpdateLocationRequest);
        showToast('success', 'Location updated', `${editingLocation.locationName} was updated.`);
      } else {
        await createCatalogueLocation(accessToken, payload as CreateLocationRequest);
        showToast('success', 'Location created', 'Location added to the catalogue.');
      }

      setFormOpen(false);
      setEditingLocation(null);
      await reloadData();
    } catch (error) {
      showToast('error', 'Save failed', getErrorMessage(error, 'We could not save the location.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(location: CatalogueLocationResponse) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    const confirmed = window.confirm(`Remove ${location.locationName}? Locations already linked to resources cannot be removed.`);
    if (!confirmed) return;

    setDeletingId(location.id);
    try {
      await deleteCatalogueLocation(accessToken, location.id);
      showToast('success', 'Location removed', `${location.locationName} was removed.`);
      await reloadData();
    } catch (error) {
      showToast('error', 'Remove failed', getErrorMessage(error, 'We could not remove the location.'));
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
            Locations
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
            Manage building-based locations that resources will reference.
          </p>
        </div>
      )}

      <Card>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <MapPinned size={18} />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800 }}>
                  {embedded ? 'Location Management' : 'Locations'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  Assign locations to buildings and keep codes aligned with wing and prefix rules.
                </div>
              </div>
            </div>
            <Button
              variant="glass"
              size="sm"
              iconLeft={<Plus size={14} />}
              onClick={() => {
                setEditingLocation(null);
                setFormOpen(true);
              }}
            >
              Add Location
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <Input
              label="Search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search location, building, code..."
              iconLeft={<Search size={15} />}
            />
            <Select
              label="Building"
              value={buildingFilter}
              onChange={(event) => setBuildingFilter(event.target.value)}
              options={[
                { value: '', label: 'All buildings' },
                ...buildings.map((building) => ({
                  value: building.id,
                  label: formatBuildingOptionLabel(building),
                })),
              ]}
            />
            <Select
              label="Location Type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              options={[{ value: '', label: 'All types' }, ...locationTypeOptions]}
            />
          </div>

          {loadError && <Alert variant="error" title="Could not load locations">{loadError}</Alert>}

          {formOpen && (
            <LocationFormModal
              title={editingLocation ? `Edit ${editingLocation.locationName}` : 'Add Location'}
              location={editingLocation}
              buildingOptions={buildings}
              existingLocations={locations}
              submitting={saving}
              onCancel={() => {
                setFormOpen(false);
                setEditingLocation(null);
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
                  <TableHeader>Location</TableHeader>
                  <TableHeader>Building</TableHeader>
                  <TableHeader>Wing</TableHeader>
                  <TableHeader>Floor</TableHeader>
                  <TableHeader>Code</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>Loading locations…</TableCell>
                  </TableRow>
                ) : filteredLocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>No locations match the current filters.</TableCell>
                  </TableRow>
                ) : (
                  filteredLocations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell>
                        <div style={{ display: 'grid', gap: 2 }}>
                          <span>{location.locationName}</span>
                          {location.description && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{location.description}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {location.buildingName
                          ? `${location.buildingName}${location.buildingCode ? ` (${location.buildingCode})` : ''}`
                          : '—'}
                      </TableCell>
                      <TableCell>{getWingLabel(location.wing)}</TableCell>
                      <TableCell>{location.floor ?? '—'}</TableCell>
                      <TableCell>{location.roomCode ?? '—'}</TableCell>
                      <TableCell><Chip color="blue">{getLocationTypeLabel(location.locationType as LocationType)}</Chip></TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Button
                            size="xs"
                            variant="subtle"
                            onClick={() => {
                              setEditingLocation(location);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            loading={deletingId === location.id}
                            onClick={() => void handleDelete(location)}
                          >
                            Remove
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
