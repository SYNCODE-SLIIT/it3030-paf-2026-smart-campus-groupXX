'use client';

import React from 'react';
import { Eye, PowerOff } from 'lucide-react';

import { Button, Chip } from '@/components/ui';
import { AdminConfirmDialog } from '@/components/screens/admin/AdminConfirmDialog';
import type { ResourceResponse } from '@/lib/api-types';
import {
  getResourceCategoryChipColor,
  getResourceCategoryLabel,
  getResourceStatusChipColor,
  getResourceStatusLabel,
} from '@/lib/resource-display';
import { SEC_HD_LABEL } from './ticketDetailHelpers';

interface TicketResourceCardProps {
  resource: ResourceResponse;
  canDeactivate?: boolean;
  onDeactivate?: () => void;
  deactivating?: boolean;
}

function ResourceRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          fontWeight: 700,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-body)' }}>
        {children}
      </span>
    </div>
  );
}

export function TicketResourceCard({
  resource,
  canDeactivate = false,
  onDeactivate,
  deactivating = false,
}: TicketResourceCardProps) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const locationLabel =
    resource.locationDetails?.name ?? resource.location ?? '—';

  function handleConfirm() {
    setConfirmOpen(false);
    onDeactivate?.();
  }

  return (
    <>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--card-shadow)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={SEC_HD_LABEL}>Linked Resource</span>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <ResourceRow label="Name">{resource.name}</ResourceRow>

          <div style={{ paddingTop: 12 }}>
            <ResourceRow label="Category">
              <Chip color={getResourceCategoryChipColor(resource.category)} size="sm">
                {getResourceCategoryLabel(resource.category)}
              </Chip>
            </ResourceRow>
          </div>

          <div style={{ paddingTop: 12 }}>
            <ResourceRow label="Location">{locationLabel}</ResourceRow>
          </div>

          <div style={{ paddingTop: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: '.18em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                Status
              </span>
              <Chip color={getResourceStatusChipColor(resource.status)} size="sm" dot>
                {getResourceStatusLabel(resource.status)}
              </Chip>
            </div>
          </div>

          {canDeactivate && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Button variant="glass" size="xs" iconLeft={<Eye size={12} />} disabled style={{ flex: 1 }}>
                View
              </Button>
              {resource.status === 'ACTIVE' && (
                <Button
                  variant="danger"
                  size="xs"
                  iconLeft={<PowerOff size={12} />}
                  loading={deactivating}
                  onClick={() => setConfirmOpen(true)}
                  style={{ flex: 1 }}
                >
                  Deactivate
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <AdminConfirmDialog
        open={confirmOpen}
        title="Deactivate Resource"
        description={`This will mark "${resource.name}" as Inactive. It can be reactivated from the resource management panel.`}
        confirmLabel="Deactivate"
        confirmVariant="danger"
        confirmIcon={<PowerOff size={13} />}
        alertVariant="warning"
        loading={deactivating}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
