'use client';

import React from 'react';
import { BellRing, BookOpen, Calendar, ShieldCheck, Ticket } from 'lucide-react';

import { useToast } from '@/components/providers/ToastProvider';
import { Alert, Button, Dialog, Skeleton, Toggle } from '@/components/ui';
import { getErrorMessage } from '@/lib/api-client';
import type {
  NotificationDomain,
  NotificationPreferenceCategoryResponse,
} from '@/lib/api-types';
import { useNotificationPreferences } from '@/components/notifications/useNotificationPreferences';

const DOMAIN_METADATA: Record<
  NotificationDomain,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  }
> = {
  TICKET: {
    label: 'Tickets',
    description: 'Assignment updates, comments, status changes, and SLA alerts.',
    icon: Ticket,
  },
  BOOKING: {
    label: 'Bookings',
    description: 'Approvals, reminders, changes, cancellations, and outcomes.',
    icon: Calendar,
  },
  CATALOG: {
    label: 'Catalogue',
    description: 'Resource availability, catalogue changes, and operational updates.',
    icon: BookOpen,
  },
  SYSTEM: {
    label: 'System',
    description: 'Security, access, and general workspace announcements.',
    icon: ShieldCheck,
  },
};

function cloneCategories(categories: NotificationPreferenceCategoryResponse[]) {
  return categories.map((category) => ({ ...category }));
}

function categoriesEqual(
  left: NotificationPreferenceCategoryResponse[],
  right: NotificationPreferenceCategoryResponse[],
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function PreferencesSkeleton() {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`notification-preferences-skeleton-${index}`}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto auto',
            gap: 14,
            padding: 18,
            borderRadius: 16,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <Skeleton variant="line" width="38%" height={14} />
            <Skeleton variant="line" width="86%" height={10} />
          </div>
          <Skeleton variant="rect" width={102} height={24} style={{ borderRadius: 999 }} />
          <Skeleton variant="rect" width={102} height={24} style={{ borderRadius: 999 }} />
        </div>
      ))}
    </div>
  );
}

export function NotificationPreferencesDialog({
  open,
  onClose,
  accessToken,
}: {
  open: boolean;
  onClose: () => void;
  accessToken: string | null;
}) {
  const { showToast } = useToast();
  const {
    preferences,
    loading,
    saving,
    error,
    loadPreferences,
    savePreferences,
  } = useNotificationPreferences(accessToken);
  const [draft, setDraft] = React.useState<NotificationPreferenceCategoryResponse[]>([]);

  React.useEffect(() => {
    if (!open || !accessToken) {
      return;
    }

    void loadPreferences();
  }, [accessToken, open, loadPreferences]);

  React.useEffect(() => {
    if (!open || !preferences) {
      return;
    }

    setDraft(cloneCategories(preferences.categories));
  }, [open, preferences]);

  const canRenderDraft = draft.length > 0;
  const hasLoadedPreferences = preferences?.categories?.length;
  const isDirty = preferences ? !categoriesEqual(draft, preferences.categories) : false;

  function updateCategory(
    domain: NotificationDomain,
    channel: 'inAppEnabled' | 'emailEnabled',
    value: boolean,
  ) {
    setDraft((current) =>
      current.map((category) => (
        category.domain === domain
          ? { ...category, [channel]: value }
          : category
      )),
    );
  }

  async function handleSave() {
    try {
      const response = await savePreferences(draft);
      setDraft(cloneCategories(response.categories));
      showToast('success', 'Preferences saved', 'Notification delivery settings were updated.');
      onClose();
    } catch (saveError) {
      showToast('error', 'Save failed', getErrorMessage(saveError, 'Could not save notification preferences.'));
    }
  }

  const content = (
    <div style={{ padding: 24, display: 'grid', gap: 18 }}>
      <style>{`
        .notification-preference-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 14px;
          padding: 18px;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: var(--surface);
          align-items: center;
        }
        .notification-preference-controls {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        @media (max-width: 720px) {
          .notification-preference-row {
            grid-template-columns: 1fr;
          }
          .notification-preference-controls {
            justify-content: flex-start;
          }
        }
      `}</style>
      <div style={{ display: 'grid', gap: 6 }}>
        <p
          style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--text-h)',
            fontWeight: 700,
          }}
        >
          <BellRing size={18} />
          Choose how each notification category reaches you
        </p>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
          Changes apply to future notifications. Existing items already in your inbox will stay visible.
        </p>
      </div>

      {error && (
        <Alert variant="error" title="Preferences unavailable">
          {error}
        </Alert>
      )}

      {!accessToken ? (
        <Alert variant="warning" title="Session unavailable">
          Please sign in again to manage notification preferences.
        </Alert>
      ) : loading && !canRenderDraft ? (
        <PreferencesSkeleton />
      ) : !hasLoadedPreferences && !canRenderDraft ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="subtle" size="sm" onClick={() => void loadPreferences(true)}>
            Retry
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {draft.map((category) => {
            const metadata = DOMAIN_METADATA[category.domain];
            const Icon = metadata.icon;

            return (
              <section
                key={category.domain}
                aria-labelledby={`notification-preference-${category.domain}`}
                className="notification-preference-row"
              >
                <div style={{ display: 'grid', gap: 5, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(238,202,68,.12)',
                        color: 'var(--yellow-700)',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} strokeWidth={2.2} />
                    </span>
                    <span
                      id={`notification-preference-${category.domain}`}
                      style={{ fontWeight: 800, color: 'var(--text-h)', fontSize: 14 }}
                    >
                      {metadata.label}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6 }}>
                    {metadata.description}
                  </p>
                </div>

                <div className="notification-preference-controls">
                  <Toggle
                    label="In-app"
                    checked={category.inAppEnabled}
                    disabled={saving}
                    onChange={(checked) => updateCategory(category.domain, 'inAppEnabled', checked)}
                  />

                  <Toggle
                    label="Email"
                    checked={category.emailEnabled}
                    disabled={saving}
                    onChange={(checked) => updateCategory(category.domain, 'emailEnabled', checked)}
                  />
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          paddingTop: 4,
          borderTop: '1px solid var(--border)',
        }}
      >
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => void handleSave()}
          disabled={!canRenderDraft || !isDirty}
          loading={saving}
        >
          Save
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!saving) {
          onClose();
        }
      }}
      title="Notification preferences"
      size="md"
      closeOnBackdropClick={!saving}
    >
      {content}
    </Dialog>
  );
}
