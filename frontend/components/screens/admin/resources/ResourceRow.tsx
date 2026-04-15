'use client';

import React from 'react';
import { PencilLine, Trash2 } from 'lucide-react';

import { Button, Chip } from '@/components/ui';
import type { ResourceResponse } from '@/lib/api-types';
import {
  formatResourceCapacity,
  getResourceCategoryChipColor,
  getResourceCategoryLabel,
  getResourceStatusChipColor,
  getResourceStatusLabel,
} from '@/lib/resource-display';

export function ResourceRow({
  resource,
  canManage,
  deleting,
  onEdit,
  onDelete,
}: {
  resource: ResourceResponse;
  canManage: boolean;
  deleting?: boolean;
  onEdit: (resource: ResourceResponse) => void;
  onDelete: (resource: ResourceResponse) => void;
}) {
  return (
    <tr>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-h)' }}>{resource.code}</td>
      <td>
        <div style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>{resource.name}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{resource.subcategory || '-'}</span>
        </div>
      </td>
      <td>
        <Chip color={getResourceCategoryChipColor(resource.category)} dot>
          {getResourceCategoryLabel(resource.category)}
        </Chip>
      </td>
      <td>{resource.location || '-'}</td>
      <td>{formatResourceCapacity(resource)}</td>
      <td>
        <Chip color={getResourceStatusChipColor(resource.status)} dot>
          {getResourceStatusLabel(resource.status)}
        </Chip>
      </td>
      <td>
        {canManage ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="subtle"
              size="xs"
              iconLeft={<PencilLine size={12} />}
              onClick={() => onEdit(resource)}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="ghost-danger"
              size="xs"
              loading={deleting}
              iconLeft={<Trash2 size={12} />}
              onClick={() => onDelete(resource)}
            >
              Delete
            </Button>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Read only</span>
        )}
      </td>
    </tr>
  );
}
