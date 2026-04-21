'use client';

import React from 'react';
import { Boxes, FolderOpen, MapPinned, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip } from '@/components/ui';
import { AdminResourcesScreen } from '@/components/screens/AdminResourcesScreen';
import { CatalogueLocationsScreen } from '@/components/screens/catalogue/CatalogueLocationsScreen';
import { CatalogueResourceTypesScreen } from '@/components/screens/catalogue/CatalogueResourceTypesScreen';
import { getErrorMessage, listResources } from '@/lib/api-client';
import type { ResourceResponse } from '@/lib/api-types';

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
            {value}
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

  const [resources, setResources] = React.useState<ResourceResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [activeSection, setActiveSection] = React.useState<'resources' | 'locations' | 'resource-types'>('resources');

  const loadResources = React.useCallback(async () => {
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
      setLoadError(getErrorMessage(error, 'We could not load catalogue data.'));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void loadResources();
  }, [loadResources]);

  const activeCount = resources.filter((resource) => resource.status === 'ACTIVE').length;
  const bookableCount = resources.filter((resource) => resource.bookable).length;
  const locationCount = new Set(
    resources
      .map((resource) => resource.locationDetails?.locationName ?? resource.location)
      .filter(Boolean),
  ).size;
  const isManagerWorkspace = workspaceLabel === 'Manager Workspace';

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {workspaceLabel}
          </p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, lineHeight: 1.1, color: 'var(--text-h)' }}>
            Catalogue Management
          </h1>
          <p style={{ margin: '8px 0 0', maxWidth: 760, color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
            Review the current resource catalogue footprint, monitor active inventory coverage, and prepare the next stage of normalized catalogue management without disrupting existing booking flows.
          </p>
        </div>
        <Chip color="blue" dot>{roleLabel}</Chip>
      </div>

      {loadError && (
        <Alert variant="error" title="Could not load catalogue data">
          {loadError}
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
        <SummaryCard label="Total Resources" value={resources.length} caption="Catalogue entries currently available in the system." icon={FolderOpen} />
        <SummaryCard label="Active" value={activeCount} caption="Resources currently available for downstream booking or operational use." icon={ShieldCheck} />
        <SummaryCard label="Bookable" value={bookableCount} caption="Entries flagged as bookable in the current compatibility model." icon={Boxes} />
        <SummaryCard label="Locations" value={locationCount} caption="Distinct legacy location labels currently mirrored on resource records." icon={MapPinned} />
      </div>

      <Card>
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-h)' }}>Management Workspace</div>
              <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 13 }}>
                This shell keeps catalogue operations visible while the normalized create and maintenance flows are integrated into the UI.
              </div>
            </div>
            <Button variant="subtle" size="sm" iconLeft={<RefreshCcw size={14} />} onClick={() => void loadResources()}>
              Refresh
            </Button>
          </div>

          <Alert variant="info" title="Normalized catalogue rollout">
            Resource types, locations, features, images, and availability windows are now present in the backend. This dashboard is the safe access point before the full normalized editor replaces the legacy-facing resource management form.
          </Alert>

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

          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>Catalogue Operations</div>
                <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 13 }}>
                  Manage normalized resources, building-based locations, and reusable resource types from the same workspace.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button variant={activeSection === 'resources' ? 'glass' : 'subtle'} size="sm" onClick={() => setActiveSection('resources')}>
                  Resources
                </Button>
                <Button variant={activeSection === 'locations' ? 'glass' : 'subtle'} size="sm" onClick={() => setActiveSection('locations')}>
                  Locations
                </Button>
                <Button variant={activeSection === 'resource-types' ? 'glass' : 'subtle'} size="sm" onClick={() => setActiveSection('resource-types')}>
                  Resource Types
                </Button>
              </div>
            </div>
            {activeSection === 'resources' && <AdminResourcesScreen embedded />}
            {activeSection === 'locations' && <CatalogueLocationsScreen embedded />}
            {activeSection === 'resource-types' && <CatalogueResourceTypesScreen embedded />}
          </div>
        </div>
      </Card>
    </div>
  );
}
