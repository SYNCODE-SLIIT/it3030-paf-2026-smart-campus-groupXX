'use client';

import React from 'react';
import { LayoutGrid } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { ResourceFilters, type ResourceFilterState } from '@/components/screens/admin/resources/ResourceFilters';
import { ResourceFormModal } from '@/components/screens/admin/resources/ResourceFormModal';
import { ResourceTable } from '@/components/screens/admin/resources/ResourceTable';
import { Alert, Button, Card } from '@/components/ui';
import { createResource, getErrorMessage, listResources, updateResource } from '@/lib/api-client';
import type { CreateResourceRequest, ResourceResponse, UserResponse } from '@/lib/api-types';
import { canManageResourceCatalogue } from '@/lib/resource-display';

type NoticeState =
  | {
      variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
      title: string;
      message: string;
    }
  | null;

const defaultFilters: ResourceFilterState = {
  search: '',
  category: '',
  status: '',
  location: '',
};

export function AdminResourcesScreen({ currentUser }: { currentUser?: UserResponse }) {
  const { session, appUser } = useAuth();
  const resolvedUser = currentUser ?? appUser ?? null;
  const accessToken = session?.access_token ?? null;
  const canManage = canManageResourceCatalogue(resolvedUser);
  const [filters, setFilters] = React.useState<ResourceFilterState>(defaultFilters);
  const deferredResourceSearch = React.useDeferredValue(filters.search);
  const deferredLocation = React.useDeferredValue(filters.location);
  const [resources, setResources] = React.useState<ResourceResponse[]>([]);
  const [loadingResources, setLoadingResources] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<NoticeState>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingResource, setEditingResource] = React.useState<ResourceResponse | null>(null);
  const [savingResource, setSavingResource] = React.useState(false);
  const [resourcePendingDelete, setResourcePendingDelete] = React.useState<ResourceResponse | null>(null);
  const [deletingResourceId, setDeletingResourceId] = React.useState<string | null>(null);
  const [isRefreshing, startRefreshTransition] = React.useTransition();

  const fetchResources = React.useCallback(async () => {
    if (!accessToken) {
      setLoadingResources(false);
      setLoadError('The current session is unavailable. Please sign in again.');
      setResources([]);
      return;
    }

    setLoadingResources(true);
    setLoadError(null);

    try {
      const nextResources = await listResources(accessToken, {
        search: deferredResourceSearch || undefined,
        category: filters.category,
        status: filters.status,
        location: deferredLocation || undefined,
      });

      setResources(nextResources);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load the resource catalogue.'));
      setResources([]);
    } finally {
      setLoadingResources(false);
    }
  }, [accessToken, deferredLocation, deferredResourceSearch, filters.category, filters.status]);

  React.useEffect(() => {
    void fetchResources();
  }, [fetchResources]);

  React.useEffect(() => {
    if (!resourcePendingDelete) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && deletingResourceId !== resourcePendingDelete.id) {
        setResourcePendingDelete(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deletingResourceId, resourcePendingDelete]);

  if (!resolvedUser) {
    return null;
  }

  async function handleSaveResource(payload: CreateResourceRequest) {
    if (!accessToken) {
      const message = 'The current session is unavailable. Please sign in again.';
      setNotice({
        variant: 'error',
        title: 'Session unavailable',
        message,
      });
      throw new Error(message);
    }

    setSavingResource(true);

    try {
      if (editingResource) {
        await updateResource(accessToken, editingResource.id, payload);
        setNotice({
          variant: 'success',
          title: 'Resource updated',
          message: `${payload.name} was updated successfully.`,
        });
      } else {
        await createResource(accessToken, payload);
        setNotice({
          variant: 'success',
          title: 'Resource created',
          message: `${payload.name} was added to the catalogue.`,
        });
      }

      setIsFormOpen(false);
      setEditingResource(null);
      await fetchResources();
    } catch (error) {
      throw new Error(getErrorMessage(error, 'We could not save this resource right now.'));
    } finally {
      setSavingResource(false);
    }
  }

  async function handleDeleteResource() {
    if (!accessToken || !resourcePendingDelete) {
      setNotice({
        variant: 'error',
        title: 'Delete unavailable',
        message: 'The resource could not be removed because the current session is unavailable.',
      });
      return;
    }

    const target = resourcePendingDelete;
    setDeletingResourceId(target.id);

    try {
      await updateResource(accessToken, target.id, { status: 'INACTIVE' });
      setNotice({
        variant: 'success',
        title: 'Resource removed',
        message: `${target.name} was removed from the active catalogue.`,
      });
      setResourcePendingDelete(null);
      await fetchResources();
    } catch (error) {
      setNotice({
        variant: 'error',
        title: 'Delete failed',
        message: getErrorMessage(error, 'We could not remove this resource right now.'),
      });
    } finally {
      setDeletingResourceId(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--text-h)',
            }}
          >
            Resources
          </h1>
        </div>

        <Button
          variant="glass"
          size="sm"
          disabled={!canManage}
          iconLeft={<LayoutGrid size={14} />}
          onClick={() => {
            setEditingResource(null);
            setIsFormOpen(true);
          }}
        >
          Add Resource
        </Button>
      </div>

      {notice && (
        <Alert variant={notice.variant} title={notice.title}>
          {notice.message}
        </Alert>
      )}

      {!canManage && (
        <Alert variant="info" title="Read-only access">
          You can browse the resource catalogue, but only administrators and catalog managers can create, edit, or remove resources.
        </Alert>
      )}

      <ResourceFilters
        filters={filters}
        onChange={setFilters}
        refreshing={isRefreshing}
        onRefresh={() => {
          startRefreshTransition(async () => {
            await fetchResources();
          });
        }}
      />

      <ResourceTable
        resources={resources}
        loading={loadingResources}
        error={loadError}
        canManage={canManage}
        deletingResourceId={deletingResourceId}
        onEdit={(resource) => {
          if (!canManage) {
            return;
          }

          setEditingResource(resource);
          setIsFormOpen(true);
        }}
        onDelete={(resource) => {
          if (!canManage) {
            return;
          }

          setResourcePendingDelete(resource);
        }}
      />

      <ResourceFormModal
        open={isFormOpen}
        resource={editingResource}
        saving={savingResource}
        onClose={() => {
          if (savingResource) {
            return;
          }

          setIsFormOpen(false);
          setEditingResource(null);
        }}
        onSubmit={async (payload) => {
          try {
            await handleSaveResource(payload);
          } catch (error) {
            setNotice({
              variant: 'error',
              title: editingResource ? 'Update failed' : 'Creation failed',
              message: getErrorMessage(error, 'We could not save this resource right now.'),
            });
            throw error;
          }
        }}
      />

      {resourcePendingDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'rgba(20, 18, 12, 0.44)',
            backdropFilter: 'blur(10px)',
          }}
          onClick={() => {
            if (deletingResourceId !== resourcePendingDelete.id) {
              setResourcePendingDelete(null);
            }
          }}
        >
          <div style={{ width: 'min(100%, 520px)' }} onClick={(event) => event.stopPropagation()}>
            <Card>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-h)' }}>
                    Remove Resource
                  </p>
                  <p style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-body)' }}>
                    Are you sure you want to remove this resource?
                  </p>
                  <p style={{ marginTop: 6, fontSize: 12.5, color: 'var(--text-muted)' }}>
                    This action is expected to soft-delete the item by marking it inactive in the catalogue.
                  </p>
                </div>

                <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-h)' }}>{resourcePendingDelete.name}</p>
                  <p style={{ marginTop: 4, fontSize: 12.5, color: 'var(--text-muted)' }}>{resourcePendingDelete.code}</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    disabled={deletingResourceId === resourcePendingDelete.id}
                    onClick={() => setResourcePendingDelete(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    loading={deletingResourceId === resourcePendingDelete.id}
                    onClick={() => {
                      void handleDeleteResource();
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
