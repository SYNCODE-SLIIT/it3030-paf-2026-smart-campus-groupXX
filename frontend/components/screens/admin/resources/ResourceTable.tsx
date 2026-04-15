'use client';

import React from 'react';

import { Alert, Card, Skeleton } from '@/components/ui';
import type { ResourceResponse } from '@/lib/api-types';
import { ResourceRow } from './ResourceRow';

export function ResourceTable({
  resources,
  loading,
  error,
  canManage,
  deletingResourceId,
  onEdit,
  onDelete,
}: {
  resources: ResourceResponse[];
  loading: boolean;
  error: string | null;
  canManage: boolean;
  deletingResourceId: string | null;
  onEdit: (resource: ResourceResponse) => void;
  onDelete: (resource: ResourceResponse) => void;
}) {
  return (
    <>
      <style>{`
        .resource-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13px;
        }

        .resource-table thead th {
          text-align: left;
          padding: 12px 14px;
          font-family: var(--font-mono);
          font-size: 8px;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }

        .resource-table tbody td {
          padding: 14px;
          border-bottom: 1px solid rgba(20,18,12,.08);
          color: var(--text-body);
          vertical-align: middle;
          transition: background .16s ease;
        }

        .resource-table tbody tr {
          transition: transform .16s ease, box-shadow .16s ease, background .16s ease;
        }

        .resource-table tbody tr:hover td {
          background: rgba(238,202,68,.06);
        }
      `}</style>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: 18 }}>
            <Alert variant="error" title="Catalogue unavailable">
              {error}
            </Alert>
          </div>
        ) : loading ? (
          <div style={{ display: 'grid', gap: 10, padding: 16 }}>
            <Skeleton variant="rect" height={54} />
            <Skeleton variant="rect" height={54} />
            <Skeleton variant="rect" height={54} />
            <Skeleton variant="rect" height={54} />
          </div>
        ) : resources.length === 0 ? (
          <div style={{ padding: 18 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>
              No resources found
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="resource-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <ResourceRow
                    key={resource.id}
                    resource={resource}
                    canManage={canManage}
                    deleting={deletingResourceId === resource.id}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
