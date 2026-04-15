'use client';

import React from 'react';
import { RefreshCw, Search } from 'lucide-react';

import { Button, Card, Input, Select, Tabs } from '@/components/ui';
import type { ResourceCategory, ResourceStatus } from '@/lib/api-types';
import { resourceCategoryOptions, resourceStatusOptions } from '@/lib/resource-display';

type CategoryTab = 'ALL' | ResourceCategory;

export interface ResourceFilterState {
  search: string;
  category: ResourceCategory | '';
  status: ResourceStatus | '';
  location: string;
}

export function ResourceFilters({
  filters,
  onChange,
  onRefresh,
  refreshing,
}: {
  filters: ResourceFilterState;
  onChange: (filters: ResourceFilterState) => void;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const tabs = React.useMemo(
    () => [
      { value: 'ALL', label: 'All' },
      ...resourceCategoryOptions.map((option) => ({ value: option.value, label: option.label })),
    ],
    [],
  );

  const activeCategoryTab: CategoryTab = filters.category || 'ALL';

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: 'grid', gap: 14 }}>
        <Tabs
          variant="pill"
          tabs={tabs}
          value={activeCategoryTab}
          onChange={(value) => {
            onChange({
              ...filters,
              category: value === 'ALL' ? '' : (value as ResourceCategory),
            });
          }}
        />

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Input
            label="Search"
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Search resources..."
            iconLeft={<Search size={16} />}
            style={{ flex: 1, minWidth: 220 }}
          />
          <Select
            label="Category"
            value={filters.category}
            onChange={(event) => onChange({ ...filters, category: event.target.value as ResourceCategory | '' })}
            options={[{ value: '', label: 'All categories' }, ...resourceCategoryOptions]}
            style={{ minWidth: 180 }}
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(event) => onChange({ ...filters, status: event.target.value as ResourceStatus | '' })}
            options={[{ value: '', label: 'All statuses' }, ...resourceStatusOptions]}
            style={{ minWidth: 180 }}
          />
          <Input
            label="Location"
            value={filters.location}
            onChange={(event) => onChange({ ...filters, location: event.target.value })}
            placeholder="Library, Gym, Lab A"
            style={{ minWidth: 200, flex: 1 }}
          />
          <Button variant="subtle" size="sm" loading={refreshing} iconLeft={<RefreshCw size={14} />} onClick={onRefresh}>
            Refresh
          </Button>
        </div>
      </div>
    </Card>
  );
}
