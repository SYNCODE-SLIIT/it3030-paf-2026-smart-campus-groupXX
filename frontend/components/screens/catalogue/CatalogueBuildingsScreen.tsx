'use client';

import React from 'react';
import { Building2, Search } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { AnimatedCounter } from '@/components/charts';
import { Alert, Card, Chip, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { getErrorMessage, listCatalogueBuildings } from '@/lib/api-client';
import { buildingTypeOptions, getBuildingLayoutLabel, getBuildingTypeChipColor, getBuildingTypeLabel } from '@/lib/building-display';
import type { BuildingResponse } from '@/lib/api-types';

export function CatalogueBuildingsScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;

  const [buildings, setBuildings] = React.useState<BuildingResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  const deferredSearch = React.useDeferredValue(searchText);

  const reloadBuildings = React.useCallback(async () => {
    if (!accessToken) {
      setLoadError('Your session is unavailable. Please sign in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const nextBuildings = await listCatalogueBuildings(accessToken);
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

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      <div>
        <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Manager Workspace
        </p>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, lineHeight: 1.1, color: 'var(--text-h)' }}>
          Buildings
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
          Building records that support catalogue locations and dashboard analytics.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <Card hoverable>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>
            <AnimatedCounter value={buildings.length} />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Total buildings</div>
        </Card>
        <Card hoverable>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>
            <AnimatedCounter value={buildings.filter((item) => item.isActive).length} />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Active buildings</div>
        </Card>
        <Card hoverable>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>
            <AnimatedCounter value={buildings.filter((item) => item.hasWings).length} />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Wing-based buildings</div>
        </Card>
        <Card hoverable>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>
            <AnimatedCounter value={buildings.filter((item) => item.buildingType === 'OUTDOOR').length} />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Outdoor records</div>
        </Card>
      </div>

      <Card>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={18} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800 }}>Buildings Overview</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Search and review buildings connected to catalogue entities.</div>
            </div>
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

          <div style={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Code</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Layout</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>Loading buildings...</TableCell>
                  </TableRow>
                ) : filteredBuildings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>No buildings match the current filters.</TableCell>
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
