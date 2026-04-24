'use client';

import React from 'react';
import { Boxes, FolderOpen, MapPinned, Plus, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip, Tabs } from '@/components/ui';
import { AnimatedCounter } from '@/components/charts';
import { AdminResourcesScreen } from '@/components/screens/AdminResourcesScreen';
import { CatalogueLocationsScreen } from '@/components/screens/catalogue/CatalogueLocationsScreen';
import { CatalogueResourceTypesScreen } from '@/components/screens/catalogue/CatalogueResourceTypesScreen';
import { getErrorMessage, getResourceStats } from '@/lib/api-client';
import type { ResourceStats } from '@/lib/api-types';

function SummaryCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string;
  value: number;
  caption: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  return (
    <Card hoverable>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {label}
          </p>
          <p style={{ margin: '10px 0 0', fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900, color: 'var(--text-h)' }}>
            <AnimatedCounter value={value} />
          </p>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>{caption}</p>
        </div>
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(238,202,68,.14)',
            color: 'var(--yellow-700)',
            flexShrink: 0,
          }}
        >
          <Icon size={18} strokeWidth={2.2} />
        </span>
      </div>
    </Card>
  );
}

export function CatalogueManagementDashboardScreen({
  workspaceLabel,
  roleLabel,
}: {
  workspaceLabel: 'Admin Console' | 'Manager Workspace';
  roleLabel: string;
}) {
  const { session } = useAuth();
  const router = useRouter();
  const accessToken = session?.access_token ?? null;

  const [stats, setStats] = React.useState<ResourceStats | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [activeSection, setActiveSection] = React.useState<'resources' | 'locations' | 'resource-types'>('resources');
  const [resourceAddOpen, setResourceAddOpen] = React.useState(false);
  const [locationAddOpen, setLocationAddOpen] = React.useState(false);
  const [resourceTypeAddOpen, setResourceTypeAddOpen] = React.useState(false);

  function handleSectionChange(section: typeof activeSection) {
    setActiveSection(section);
    setResourceAddOpen(false);
    setLocationAddOpen(false);
    setResourceTypeAddOpen(false);
  }

  const addLabels: Record<typeof activeSection, string> = {
    resources: 'Add Resource',
    locations: 'Add Location',
    'resource-types': 'Add Resource Type',
  };

  function handleAddClick() {
    if (activeSection === 'resources') setResourceAddOpen(true);
    else if (activeSection === 'locations') setLocationAddOpen(true);
    else setResourceTypeAddOpen(true);
  }

  const loadStats = React.useCallback(async () => {
    if (!accessToken) {
      setLoadError('Your session is unavailable. Please sign in again.');
      return;
    }

    setLoadError(null);

    try {
      setStats(await getResourceStats(accessToken));
    } catch (error) {
      setStats(null);
      setLoadError(getErrorMessage(error, 'We could not load catalogue data.'));
    }
  }, [accessToken]);

  React.useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const totalCount = stats?.totalResources ?? 0;
  const activeCount = stats?.activeResources ?? 0;
  const bookableCount = stats?.bookableResources ?? 0;
  const locationCount = stats?.locationCount ?? 0;
  const isManagerWorkspace = workspaceLabel === 'Manager Workspace';

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {workspaceLabel}
          </p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, lineHeight: 1.1, color: 'var(--text-h)' }}>
            {isManagerWorkspace ? 'Catalogue' : 'Catalogue Management'}
          </h1>
          <p style={{ margin: '8px 0 0', maxWidth: 760, color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
            Review the current resource catalogue footprint, monitor active inventory coverage, and manage normalized resources, locations, and resource types.
          </p>
        </div>
        <Chip color="blue" dot>{roleLabel}</Chip>
      </div>

      {loadError && (
        <Alert variant="error" title="Could not load catalogue data">
          {loadError}
        </Alert>
      )}

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
        <SummaryCard label="Total Resources" value={totalCount} caption="Catalogue entries currently available in the system." icon={FolderOpen} />
        <SummaryCard label="Active" value={activeCount} caption="Resources currently available for downstream booking or operational use." icon={ShieldCheck} />
        <SummaryCard label="Bookable" value={bookableCount} caption="Entries flagged as bookable in the current compatibility model." icon={Boxes} />
        <SummaryCard label="Locations" value={locationCount} caption="Distinct legacy location labels currently mirrored on resource records." icon={MapPinned} />
      </div>

      {/* Section tabs + add button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Tabs
          variant="pill"
          tabs={[
            { value: 'resources', label: 'Resources' },
            { value: 'locations', label: 'Locations' },
            { value: 'resource-types', label: 'Resource Types' },
          ]}
          value={activeSection}
          onChange={(v) => handleSectionChange(v as typeof activeSection)}
        />
        <Button variant="glass" size="sm" iconLeft={<Plus size={14} />} onClick={handleAddClick}>
          {addLabels[activeSection]}
        </Button>
      </div>

      {/* Active table section */}
      {activeSection === 'resources' && (
        <AdminResourcesScreen
          embedded
          addOpen={resourceAddOpen}
          onAddOpenChange={setResourceAddOpen}
          onResourcesChanged={() => void loadStats()}
          resourceDetailBasePath={isManagerWorkspace ? '/managers/catalog/resources' : '/admin/resources'}
        />
      )}
      {activeSection === 'locations' && (
        <CatalogueLocationsScreen
          embedded
          addOpen={locationAddOpen}
          onAddOpenChange={setLocationAddOpen}
        />
      )}
      {activeSection === 'resource-types' && (
        <CatalogueResourceTypesScreen
          embedded
          addOpen={resourceTypeAddOpen}
          onAddOpenChange={setResourceTypeAddOpen}
        />
      )}

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <Card hoverable>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: 'var(--text-h)' }}>Reference Data</div>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7 }}>
            Resource types, locations, features, and managed-role lookup endpoints are ready for UI dropdowns and multi-select workflows.
          </p>
        </Card>
        <Card hoverable>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: 'var(--text-h)' }}>Compatibility Layer</div>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7 }}>
            Legacy category, subcategory, and location fields are still mirrored so existing screens and booking flows remain stable during rollout.
          </p>
        </Card>
        {isManagerWorkspace && (
          <Card hoverable>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: 'var(--text-h)' }}>Support Tickets</div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7 }}>
                Raise and follow catalogue-related issues using the same requester ticket flow available elsewhere in the portal.
              </p>
              <div>
                <Button variant="subtle" size="sm" onClick={() => router.push('/managers/catalog/tickets')}>
                  Open Tickets
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
