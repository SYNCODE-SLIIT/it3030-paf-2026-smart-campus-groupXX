'use client';

import React from 'react';
import {
  Activity,
  AlertTriangle,
  Boxes,
  Building2,
  CheckCircle2,
  Clock,
  FolderOpen,
  Layers,
  MapPinned,
  ShieldCheck,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip } from '@/components/ui';
import {
  AnimatedCounter,
  BarChart,
  DonutChart,
  LineChart,
  type BarDatum,
  type DonutSlice,
} from '@/components/charts';
import {
  getErrorMessage,
  getResourceStats,
  listCatalogueBuildings,
  listCatalogueLocations,
  listCatalogueResourceTypes,
  listMyTickets,
  listResources,
} from '@/lib/api-client';
import type {
  BuildingResponse,
  CatalogueLocationResponse,
  CatalogueResourceTypeResponse,
  ResourceCategory,
  ResourceListItem,
  ResourceStats,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketSummaryResponse,
} from '@/lib/api-types';
import {
  getResourceCategoryLabel,
  getResourceStatusLabel,
} from '@/lib/resource-display';

const CATEGORY_ORDER: ResourceCategory[] = [
  'SPACES',
  'TECHNICAL_EQUIPMENT',
  'MAINTENANCE_AND_CLEANING',
  'SPORTS',
  'EVENT_AND_DECORATION',
  'GENERAL_UTILITY',
  'TRANSPORT_AND_LOGISTICS',
];

const CATEGORY_COLOR: Record<ResourceCategory, string> = {
  SPACES: 'var(--blue-400)',
  TECHNICAL_EQUIPMENT: 'var(--yellow-400)',
  MAINTENANCE_AND_CLEANING: 'var(--orange-400)',
  SPORTS: 'var(--green-400)',
  EVENT_AND_DECORATION: 'var(--red-400)',
  GENERAL_UTILITY: 'var(--neutral-500)',
  TRANSPORT_AND_LOGISTICS: 'var(--blue-700)',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'var(--green-400)',
  MAINTENANCE: 'var(--orange-400)',
  OUT_OF_SERVICE: 'var(--red-400)',
  INACTIVE: 'var(--neutral-500)',
};

const TICKET_STATUS_COLOR: Record<TicketStatus, string> = {
  OPEN: 'var(--orange-400)',
  IN_PROGRESS: 'var(--blue-400)',
  RESOLVED: 'var(--green-400)',
  CLOSED: 'var(--neutral-500)',
  REJECTED: 'var(--red-400)',
};

const TICKET_PRIORITY_COLOR: Record<TicketPriority, string> = {
  LOW: 'var(--green-400)',
  MEDIUM: 'var(--blue-400)',
  HIGH: 'var(--orange-400)',
  URGENT: 'var(--red-400)',
};

const BUILDING_TYPE_LABEL: Record<string, string> = {
  ACADEMIC: 'Academic',
  LIBRARY: 'Library',
  ADMINISTRATIVE: 'Administrative',
  SPORTS: 'Sports',
  OUTDOOR: 'Outdoor',
  OTHER: 'Other',
};

const BUILDING_TYPE_COLOR: Record<string, string> = {
  ACADEMIC: 'var(--blue-400)',
  LIBRARY: 'var(--yellow-400)',
  ADMINISTRATIVE: 'var(--neutral-500)',
  SPORTS: 'var(--green-400)',
  OUTDOOR: 'var(--orange-400)',
  OTHER: 'var(--blue-700)',
};
const BAR_PALETTE = [
  'var(--yellow-400)',
  'var(--blue-400)',
  'var(--orange-400)',
  'var(--green-400)',
  'var(--red-400)',
  'var(--blue-700)',
  'var(--neutral-500)',
];

const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
};

const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  ELECTRICAL: 'Electrical',
  NETWORK: 'Network',
  EQUIPMENT: 'Equipment',
  FURNITURE: 'Furniture',
  CLEANLINESS: 'Cleanliness',
  FACILITY_DAMAGE: 'Facility Damage',
  ACCESS_SECURITY: 'Access / Security',
  OTHER: 'Other',
};

function KpiCard({
  label,
  value,
  caption,
  icon: Icon,
  accentColor,
  valueSuffix,
}: {
  label: string;
  value: number;
  caption: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  accentColor: string;
  valueSuffix?: string;
}) {
  return (
    <Card hoverable>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '.22em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            {label}
          </p>
          <p
            style={{
              margin: '12px 0 0',
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 900,
              color: 'var(--text-h)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            <AnimatedCounter value={value} />
            {valueSuffix && (
              <span style={{ marginLeft: 4, fontSize: 16, fontWeight: 700, color: 'var(--text-muted)' }}>
                {valueSuffix}
              </span>
            )}
          </p>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>{caption}</p>
        </div>
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${accentColor}1F`,
            color: accentColor,
            flexShrink: 0,
            boxShadow: `inset 0 0 0 1px ${accentColor}33`,
          }}
        >
          <Icon size={20} strokeWidth={2.2} />
        </span>
      </div>
    </Card>
  );
}

function SectionHeader({
  title,
  caption,
  icon: Icon,
  iconColor,
  right,
}: {
  title: string;
  caption?: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  iconColor?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: `${iconColor ?? 'var(--yellow-400)'}1F`,
            color: iconColor ?? 'var(--yellow-700)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={16} strokeWidth={2.4} />
        </span>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 800,
              color: 'var(--text-h)',
            }}
          >
            {title}
          </div>
          {caption && (
            <div style={{ marginTop: 2, color: 'var(--text-muted)', fontSize: 12 }}>{caption}</div>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

function emptyResourceCategoryCounter(): Record<ResourceCategory, number> {
  return CATEGORY_ORDER.reduce(
    (acc, key) => ({ ...acc, [key]: 0 }),
    {} as Record<ResourceCategory, number>,
  );
}

export function CatalogueManagerDashboardScreen({
  workspaceLabel,
  roleLabel,
}: {
  workspaceLabel: 'Manager Workspace' | 'Admin Console';
  roleLabel: string;
}) {
  const router = useRouter();
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<ResourceStats | null>(null);
  const [resources, setResources] = React.useState<ResourceListItem[]>([]);
  const [resourceTypes, setResourceTypes] = React.useState<CatalogueResourceTypeResponse[]>([]);
  const [locations, setLocations] = React.useState<CatalogueLocationResponse[]>([]);
  const [buildings, setBuildings] = React.useState<BuildingResponse[]>([]);
  const [tickets, setTickets] = React.useState<TicketSummaryResponse[]>([]);

  const reload = React.useCallback(async () => {
    if (!accessToken) {
      setLoadError('Your session is unavailable. Please sign in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const [
        statsResult,
        resourcesResult,
        resourceTypesResult,
        locationsResult,
        buildingsResult,
        ticketsResult,
      ] = await Promise.allSettled([
        getResourceStats(accessToken),
        listResources(accessToken),
        listCatalogueResourceTypes(accessToken),
        listCatalogueLocations(accessToken),
        listCatalogueBuildings(accessToken),
        listMyTickets(accessToken, { scope: 'REPORTED' }).catch(
          () => [] as TicketSummaryResponse[],
        ),
      ]);

      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      if (resourcesResult.status === 'fulfilled') setResources(resourcesResult.value);
      if (resourceTypesResult.status === 'fulfilled') setResourceTypes(resourceTypesResult.value);
      if (locationsResult.status === 'fulfilled') setLocations(locationsResult.value);
      if (buildingsResult.status === 'fulfilled') setBuildings(buildingsResult.value);
      if (ticketsResult.status === 'fulfilled') setTickets(ticketsResult.value);

      const firstError = [
        statsResult,
        resourcesResult,
        resourceTypesResult,
        locationsResult,
        buildingsResult,
      ].find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;

      if (firstError) {
        setLoadError(getErrorMessage(firstError.reason, 'Some catalogue data could not be loaded.'));
      }
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load dashboard data.'));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  // Derived metrics
  const totals = React.useMemo(() => {
    return {
      resources: stats?.totalResources ?? resources.length,
      activeResources: stats?.activeResources ?? resources.filter((r) => r.status === 'ACTIVE').length,
      bookableResources: stats?.bookableResources ?? resources.filter((r) => r.bookable).length,
      maintenanceResources: stats?.maintenanceResources ?? resources.filter((r) => r.status === 'MAINTENANCE').length,
      outOfServiceResources:
        stats?.outOfServiceResources ?? resources.filter((r) => r.status === 'OUT_OF_SERVICE').length,
      inactiveResources: stats?.inactiveResources ?? resources.filter((r) => r.status === 'INACTIVE').length,
      resourceTypes: resourceTypes.length,
      locations: stats?.locationCount ?? locations.length,
      buildings: buildings.length,
      activeBuildings: buildings.filter((b) => b.isActive).length,
      wingBasedBuildings: buildings.filter((b) => b.hasWings).length,
      outdoorBuildings: buildings.filter((b) => b.buildingType === 'OUTDOOR').length,
      tickets: tickets.length,
      openTickets: tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length,
      resolvedTickets: tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
      urgentTickets: tickets.filter(
        (t) => (t.priority === 'URGENT' || t.priority === 'HIGH') && (t.status === 'OPEN' || t.status === 'IN_PROGRESS'),
      ).length,
    };
  }, [buildings, locations.length, resources, resourceTypes.length, stats, tickets]);

  const utilizationRate = totals.resources === 0 ? 0 : Math.round((totals.activeResources / totals.resources) * 100);

  // Resources by category (donut)
  const resourcesByCategory = React.useMemo<DonutSlice[]>(() => {
    const counter = emptyResourceCategoryCounter();
    resources.forEach((resource) => {
      counter[resource.category] = (counter[resource.category] ?? 0) + 1;
    });

    return CATEGORY_ORDER.filter((cat) => counter[cat] > 0).map((cat) => ({
      label: getResourceCategoryLabel(cat),
      value: counter[cat],
      color: CATEGORY_COLOR[cat],
    }));
  }, [resources]);

  // Resource status (donut)
  const resourceStatusSlices = React.useMemo<DonutSlice[]>(() => {
    const entries: Array<['ACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE' | 'INACTIVE', number]> = [
      ['ACTIVE', totals.activeResources],
      ['MAINTENANCE', totals.maintenanceResources],
      ['OUT_OF_SERVICE', totals.outOfServiceResources],
      ['INACTIVE', totals.inactiveResources],
    ];

    return entries
      .filter(([, value]) => value > 0)
      .map(([status, value]) => ({
        label: getResourceStatusLabel(status),
        value,
        color: STATUS_COLOR[status],
      }));
  }, [totals]);

  // Resource types per category (bar)
  const resourceTypesByCategory = React.useMemo<BarDatum[]>(() => {
    const counter = emptyResourceCategoryCounter();
    resourceTypes.forEach((rt) => {
      counter[rt.category] = (counter[rt.category] ?? 0) + 1;
    });

    return CATEGORY_ORDER.filter((cat) => counter[cat] > 0).map((cat) => ({
      label: getResourceCategoryLabel(cat),
      value: counter[cat],
      color: CATEGORY_COLOR[cat],
    }));
  }, [resourceTypes]);

  // Buildings by type (donut)
  const buildingsByType = React.useMemo<DonutSlice[]>(() => {
    const counter = new Map<string, number>();
    buildings.forEach((b) => {
      counter.set(b.buildingType, (counter.get(b.buildingType) ?? 0) + 1);
    });

    return Array.from(counter.entries()).map(([type, value]) => ({
      label: BUILDING_TYPE_LABEL[type] ?? type,
      value,
      color: BUILDING_TYPE_COLOR[type] ?? 'var(--blue-400)',
    }));
  }, [buildings]);

  // Locations per building (top 8 bar)
  const locationsByBuilding = React.useMemo<BarDatum[]>(() => {
    const counter = new Map<string, number>();
    locations.forEach((loc) => {
      const key = loc.buildingName ?? 'Unassigned';
      counter.set(key, (counter.get(key) ?? 0) + 1);
    });

    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([buildingName, value], index) => ({
        label: buildingName,
        value,
        color: BAR_PALETTE[index % BAR_PALETTE.length],
      }));
  }, [locations]);

  // Resources per managed-by-role (bar) — gives quick view of catalogue ownership
  const resourcesByManagedRole = React.useMemo<BarDatum[]>(() => {
    const counter = new Map<string, number>();
    resources.forEach((resource) => {
      const key = resource.managedByRole ?? 'UNASSIGNED';
      counter.set(key, (counter.get(key) ?? 0) + 1);
    });

    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([role, value], index) => ({
        label: prettifyEnum(role),
        value,
        color: BAR_PALETTE[index % BAR_PALETTE.length],
      }));
  }, [resources]);

  // Resource creation trend (line) — derived from createdAt of resources is unavailable on
  // ResourceListItem. We approximate "catalogue growth" using available creation dates.
  // Since list items lack timestamps, we derive a trend from tickets (which DO have createdAt)
  // grouped by week to produce a meaningful 8-week line chart.
  const ticketTrend = React.useMemo(() => {
    const now = new Date();
    const buckets: { label: string; created: number; resolved: number }[] = [];
    for (let i = 7; i >= 0; i -= 1) {
      const start = new Date(now);
      start.setDate(start.getDate() - i * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const created = tickets.filter((t) => {
        const created = new Date(t.createdAt).getTime();
        return created >= start.getTime() && created <= end.getTime();
      }).length;

      const resolved = tickets.filter((t) => {
        const resolvedDate = (t as TicketSummaryResponse & { resolvedAt?: string | null }).resolvedAt;
        if (!resolvedDate) return false;
        const r = new Date(resolvedDate).getTime();
        return r >= start.getTime() && r <= end.getTime();
      }).length;

      const label = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      buckets.push({ label, created, resolved });
    }
    return buckets;
  }, [tickets]);

  const ticketStatusSlices = React.useMemo<DonutSlice[]>(() => {
    const counter = new Map<TicketStatus, number>();
    tickets.forEach((t) => {
      counter.set(t.status, (counter.get(t.status) ?? 0) + 1);
    });

    return Array.from(counter.entries()).map(([status, value]) => ({
      label: TICKET_STATUS_LABEL[status],
      value,
      color: TICKET_STATUS_COLOR[status],
    }));
  }, [tickets]);

  const ticketPrioritySlices = React.useMemo<BarDatum[]>(() => {
    const counter = new Map<TicketPriority, number>();
    tickets.forEach((t) => {
      counter.set(t.priority, (counter.get(t.priority) ?? 0) + 1);
    });

    const order: TicketPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
    return order
      .filter((p) => (counter.get(p) ?? 0) > 0)
      .map((p) => ({
        label: TICKET_PRIORITY_LABEL[p],
        value: counter.get(p) ?? 0,
        color: TICKET_PRIORITY_COLOR[p],
      }));
  }, [tickets]);

  const ticketCategoryRows = React.useMemo<BarDatum[]>(() => {
    const counter = new Map<TicketCategory, number>();
    tickets.forEach((t) => {
      counter.set(t.category, (counter.get(t.category) ?? 0) + 1);
    });

    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, value], index) => ({
        label: TICKET_CATEGORY_LABEL[category] ?? category,
        value,
        color: BAR_PALETTE[index % BAR_PALETTE.length],
      }));
  }, [tickets]);

  return (
    <div style={{ display: 'grid', gap: 26 }}>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p
            style={{
              margin: '0 0 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '.35em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            {workspaceLabel}
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              fontWeight: 900,
              lineHeight: 1.1,
              color: 'var(--text-h)',
            }}
          >
            Dashboard
          </h1>
          <p
            style={{
              margin: '8px 0 0',
              maxWidth: 760,
              color: 'var(--text-muted)',
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            A live snapshot of catalogue inventory, supporting infrastructure, and the support tickets you are tracking.
            Use this to plan maintenance, balance ownership, and surface high-priority items.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip color="blue" dot>
            {roleLabel}
          </Chip>
          <Button
            variant="glass"
            size="sm"
            iconLeft={<Layers size={14} />}
            onClick={() => router.push('/managers/catalog')}
          >
            Manage Catalogue
          </Button>
        </div>
      </div>

      {loadError && (
        <Alert variant="error" title="Some dashboard data could not be loaded">
          {loadError}
        </Alert>
      )}

      {/* KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
        }}
      >
        <KpiCard
          label="Resources"
          value={totals.resources}
          caption="Distinct resources currently in the catalogue."
          icon={FolderOpen}
          accentColor="#EECA44"
        />
        <KpiCard
          label="Active"
          value={totals.activeResources}
          caption={`${utilizationRate}% of catalogue is active right now.`}
          icon={CheckCircle2}
          accentColor="#2DC872"
        />
        <KpiCard
          label="Bookable"
          value={totals.bookableResources}
          caption="Resources opted-in for downstream booking flows."
          icon={ShieldCheck}
          accentColor="#4D8EF7"
        />
        <KpiCard
          label="Resource Types"
          value={totals.resourceTypes}
          caption="Reusable type templates feeding new resources."
          icon={Boxes}
          accentColor="#FF9520"
        />
        <KpiCard
          label="Locations"
          value={totals.locations}
          caption="Distinct location records linked to catalogue."
          icon={MapPinned}
          accentColor="#82B3FF"
        />
        <KpiCard
          label="Buildings"
          value={totals.buildings}
          caption={`${totals.activeBuildings} currently active in the system.`}
          icon={Building2}
          accentColor="#F95A50"
        />
        <KpiCard
          label="Wing-based Buildings"
          value={totals.wingBasedBuildings}
          caption="Buildings configured with left and right wing prefixes."
          icon={Layers}
          accentColor="#4D8EF7"
        />
        <KpiCard
          label="Outdoor Buildings"
          value={totals.outdoorBuildings}
          caption="Outdoor building records used by open-space locations."
          icon={MapPinned}
          accentColor="#FF9520"
        />
        <KpiCard
          label="Tickets"
          value={totals.tickets}
          caption={`${totals.openTickets} active and need attention.`}
          icon={Ticket}
          accentColor="#FF9520"
        />
        <KpiCard
          label="Urgent / High"
          value={totals.urgentTickets}
          caption="Open tickets in URGENT or HIGH priority."
          icon={AlertTriangle}
          accentColor="#E63528"
        />
      </div>

      {/* Resources insights */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        <Card>
          <div style={{ display: 'grid', gap: 18 }}>
            <SectionHeader
              title="Resources by Category"
              caption="Live distribution of catalogue inventory."
              icon={FolderOpen}
              iconColor="var(--yellow-700)"
            />
            <DonutChart
              data={resourcesByCategory}
              centerLabel="Total"
              centerValue={totals.resources}
              emptyLabel="No resources yet"
            />
          </div>
        </Card>

        <Card>
          <div style={{ display: 'grid', gap: 18 }}>
            <SectionHeader
              title="Resource Status Mix"
              caption="Active vs maintenance vs out-of-service vs inactive."
              icon={Activity}
              iconColor="var(--green-400)"
            />
            <DonutChart
              data={resourceStatusSlices}
              centerLabel="Active"
              centerValue={`${utilizationRate}%`}
              emptyLabel="No status data"
            />
          </div>
        </Card>

        <Card>
          <div style={{ display: 'grid', gap: 18 }}>
            <SectionHeader
              title="Resource Types per Category"
              caption="Coverage of reusable type templates."
              icon={Boxes}
              iconColor="var(--orange-400)"
            />
            <BarChart data={resourceTypesByCategory} height={240} />
          </div>
        </Card>
      </div>

      {/* Locations + buildings */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        <Card>
          <div style={{ display: 'grid', gap: 18 }}>
            <SectionHeader
              title="Top Buildings by Locations"
              caption="Buildings hosting the most catalogue locations."
              icon={Building2}
              iconColor="var(--blue-400)"
            />
            <BarChart data={locationsByBuilding} height={240} defaultColor="var(--yellow-400)" />
          </div>
        </Card>

        <Card>
          <div style={{ display: 'grid', gap: 18 }}>
            <SectionHeader
              title="Buildings by Type"
              caption="Footprint across academic, library, sports, and outdoor records."
              icon={Layers}
              iconColor="var(--blue-700)"
            />
            <DonutChart
              data={buildingsByType}
              centerLabel="Buildings"
              centerValue={totals.buildings}
              emptyLabel="No building data"
            />
          </div>
        </Card>

        <Card>
          <div style={{ display: 'grid', gap: 18 }}>
            <SectionHeader
              title="Resources by Owning Role"
              caption="Who is currently accountable for each catalogue entry."
              icon={ShieldCheck}
              iconColor="var(--green-400)"
            />
            <BarChart data={resourcesByManagedRole} height={240} defaultColor="var(--orange-400)" />
          </div>
        </Card>
      </div>

      {/* Tickets analytics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: 16,
        }}
      >
        <Card>
          <div style={{ display: 'grid', gap: 18 }}>
            <SectionHeader
              title="Ticket Activity (last 8 weeks)"
              caption="Tickets you reported vs those resolved across the same window."
              icon={TrendingUp}
              iconColor="var(--orange-400)"
            />
            <LineChart
              labels={ticketTrend.map((b) => b.label)}
              series={[
                {
                  label: 'Created',
                  color: '#FF9520',
                  values: ticketTrend.map((b) => b.created),
                },
                {
                  label: 'Resolved',
                  color: '#2DC872',
                  values: ticketTrend.map((b) => b.resolved),
                },
              ]}
              height={260}
              emptyLabel="No ticket activity yet"
            />
          </div>
        </Card>

        <Card>
          <div style={{ display: 'grid', gap: 18 }}>
            <SectionHeader
              title="Ticket Status"
              caption="Where each ticket stands today."
              icon={Ticket}
              iconColor="var(--yellow-700)"
            />
            <DonutChart
              data={ticketStatusSlices}
              centerLabel="Total"
              centerValue={totals.tickets}
              emptyLabel="No tickets yet"
            />
          </div>
        </Card>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        <Card>
          <div style={{ display: 'grid', gap: 18 }}>
            <SectionHeader
              title="Ticket Priority Mix"
              caption="Backlog grouped by urgency."
              icon={AlertTriangle}
              iconColor="var(--red-400)"
            />
            <BarChart data={ticketPrioritySlices} height={220} />
          </div>
        </Card>

        <Card>
          <div style={{ display: 'grid', gap: 18 }}>
            <SectionHeader
              title="Tickets by Category"
              caption="Common issue types raised against catalogue."
              icon={Ticket}
              iconColor="var(--blue-400)"
            />
            <BarChart data={ticketCategoryRows} height={220} defaultColor="var(--blue-400)" />
          </div>
        </Card>

        <Card>
          <div style={{ display: 'grid', gap: 14 }}>
            <SectionHeader
              title="Recent Tickets"
              caption="Latest five tickets with a quick status pulse."
              icon={Clock}
              iconColor="var(--text-muted)"
            />
            <div style={{ display: 'grid', gap: 10 }}>
              {tickets.length === 0 ? (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: 'var(--surface-2)',
                    color: 'var(--text-muted)',
                    fontSize: 13,
                    textAlign: 'center',
                  }}
                >
                  No tickets reported yet.
                </div>
              ) : (
                [...tickets]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map((ticket) => (
                    <div
                      key={ticket.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 12,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 9,
                            letterSpacing: '.16em',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {ticket.ticketCode}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 600,
                            fontSize: 13,
                            color: 'var(--text-h)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {ticket.title}
                        </span>
                      </div>
                      <Chip color={chipColorForStatus(ticket.status)} dot>
                        {TICKET_STATUS_LABEL[ticket.status]}
                      </Chip>
                    </div>
                  ))
              )}
              <Button
                variant="subtle"
                size="sm"
                onClick={() => router.push('/managers/catalog/tickets')}
              >
                Open Tickets Workspace
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {loading && (
        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: 12,
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '.18em',
            textTransform: 'uppercase',
          }}
        >
          Refreshing dashboard…
        </div>
      )}
    </div>
  );
}

function chipColorForStatus(status: TicketStatus): 'green' | 'yellow' | 'red' | 'blue' | 'orange' | 'neutral' {
  switch (status) {
    case 'OPEN':
      return 'orange';
    case 'IN_PROGRESS':
      return 'blue';
    case 'RESOLVED':
      return 'green';
    case 'CLOSED':
      return 'neutral';
    case 'REJECTED':
      return 'red';
  }
}

function prettifyEnum(value: string) {
  if (value === 'UNASSIGNED') return 'Unassigned';
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}
