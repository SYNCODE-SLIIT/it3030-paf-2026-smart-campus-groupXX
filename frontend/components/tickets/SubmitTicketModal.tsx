'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Paperclip, Search, TicketPlus, Trash2, Upload } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Dialog, Input, Select, Textarea } from '@/components/ui';
import { createTicket, getErrorMessage, listResourceOptions, uploadTicketAttachment } from '@/lib/api-client';
import type { ResourceCategory, ResourceOption, TicketCategory, TicketPriority } from '@/lib/api-types';
import { getResourceCategoryLabel, resourceCategoryOptions } from '@/lib/resource-display';

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'NETWORK', label: 'Network' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'CLEANLINESS', label: 'Cleanliness' },
  { value: 'FACILITY_DAMAGE', label: 'Facility Damage' },
  { value: 'ACCESS_SECURITY', label: 'Access / Security' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface SubmitTicketModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step1 = { title: string; description: string; category: TicketCategory | '' };
type Step2 = { priority: TicketPriority | ''; resourceId: string; contactNote: string };
type StagedFile = { id: string; file: File };

const INIT_STEP1: Step1 = { title: '', description: '', category: '' };
const INIT_STEP2: Step2 = { priority: '', resourceId: '', contactNote: '' };

const STEP_LABELS = ['Issue Details', 'Priority & Context', 'Attachments'];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function isWithinOneEdit(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) return false;
  if (left === right) return true;

  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (left.length > right.length) {
      leftIndex += 1;
    } else if (right.length > left.length) {
      rightIndex += 1;
    } else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  if (leftIndex < left.length || rightIndex < right.length) {
    edits += 1;
  }

  return edits <= 1;
}

function tokenMatchesSearchWord(token: string, searchWord: string): boolean {
  if (token.includes(searchWord) || token.startsWith(searchWord)) return true;
  return searchWord.length >= 4 && isWithinOneEdit(token, searchWord);
}

function resourceMatchesSearch(resource: ResourceOption, searchText: string): boolean {
  const searchWords = normalizeSearchText(searchText).split(' ').filter(Boolean);
  if (searchWords.length === 0) return true;

  const tokens = [
    resource.name,
    resource.code,
    resource.locationName,
    resource.subcategory,
    resource.category,
    getResourceCategoryLabel(resource.category),
  ]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => normalizeSearchText(value).split(' ').filter(Boolean));

  return searchWords.every((searchWord) =>
    tokens.some((token) => tokenMatchesSearchWord(token, searchWord)),
  );
}

interface ResourcePickerDropdownProps {
  selectedResource: ResourceOption | null;
  filteredResources: ResourceOption[];
  categoryFilter: ResourceCategory | '';
  searchText: string;
  helperText: string;
  loading: boolean;
  loadError: string | null;
  onCategoryFilterChange: (category: ResourceCategory | '') => void;
  onSearchTextChange: (value: string) => void;
  onResourceChange: (resourceId: string) => void;
}

type ResourcePickerPosition = {
  left: number;
  top: number;
  width: number;
  listMaxHeight: number;
};

function ResourcePickerDropdown({
  selectedResource,
  filteredResources,
  categoryFilter,
  searchText,
  helperText,
  loading,
  loadError,
  onCategoryFilterChange,
  onSearchTextChange,
  onResourceChange,
}: ResourcePickerDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [triggerFocused, setTriggerFocused] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState<ResourcePickerPosition | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const disabled = loading || Boolean(loadError);
  const selectedHidden = Boolean(
    selectedResource && !filteredResources.some((resource) => resource.id === selectedResource.id),
  );
  const resourcesToRender = selectedHidden && selectedResource
    ? [selectedResource, ...filteredResources]
    : filteredResources;
  const triggerText = loadError
    ? 'Resources unavailable'
    : loading
      ? 'Loading resources'
      : selectedResource?.name ?? 'No resource';

  const updateMenuPosition = React.useCallback(() => {
    const trigger = wrapperRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 16;
    const panelChromeHeight = 128;
    const preferredListHeight = 230;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding - 8;
    const spaceAbove = rect.top - viewportPadding - 8;
    const shouldOpenUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableSpace = shouldOpenUp ? spaceAbove : spaceBelow;
    const listMaxHeight = Math.max(90, Math.min(preferredListHeight, availableSpace - panelChromeHeight));
    const panelHeight = panelChromeHeight + listMaxHeight;
    const left = Math.min(
      Math.max(rect.left, viewportPadding),
      Math.max(viewportPadding, window.innerWidth - rect.width - viewportPadding),
    );

    setMenuPosition({
      left,
      top: shouldOpenUp ? Math.max(viewportPadding, rect.top - panelHeight - 8) : rect.bottom + 8,
      width: rect.width,
      listMaxHeight,
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;

    function handleDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        wrapperRef.current?.contains(target)
        || menuRef.current?.contains(target)
      ) {
        return;
      }

      if (wrapperRef.current || menuRef.current) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  React.useEffect(() => {
    if (!open) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    }

    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [open]);

  React.useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  React.useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function selectResource(resourceId: string) {
    onResourceChange(resourceId);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 0 }}>
      <label
        htmlFor="st-resource-picker"
        style={{
          display: 'block',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          color: 'var(--text-label)',
          marginBottom: 7,
          transition: 'color .3s',
        }}
      >
        Resource
      </label>
      <button
        id="st-resource-picker"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onFocus={() => setTriggerFocused(true)}
        onBlur={() => setTriggerFocused(false)}
        onClick={() => setOpen((current) => !current)}
        style={{
          width: '100%',
          height: 46,
          borderRadius: 'var(--radius-md)',
          background: 'var(--input-bg)',
          border: '1.5px solid var(--input-border)',
          padding: '0 14px',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 400,
          color: selectedResource ? 'var(--input-text)' : 'var(--text-muted)',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'border-color .18s, box-shadow .18s, background .3s, color .3s',
          boxShadow: triggerFocused || open ? '0 0 0 3px rgba(238,202,68,.14)' : 'none',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            minWidth: 0,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {triggerText}
        </span>
        <ChevronDown
          size={15}
          style={{
            flexShrink: 0,
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .15s',
          }}
        />
      </button>
      <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
        {helperText}
      </p>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Resource options"
          style={{
            position: 'fixed',
            left: menuPosition?.left ?? 0,
            top: menuPosition?.top ?? 0,
            width: menuPosition?.width ?? 260,
            zIndex: 1200,
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 24px rgba(0,0,0,.1), 0 2px 8px rgba(0,0,0,.06)',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            animation: 'resource-picker-down .15s ease',
            visibility: menuPosition ? 'visible' : 'hidden',
          }}
        >
          <style>{`
            @keyframes resource-picker-down {
              from { opacity: 0; transform: translateY(-6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div style={{ padding: 12, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 13,
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  pointerEvents: 'none',
                }}
              >
                <Search size={14} />
              </span>
              <input
                ref={searchRef}
                id="st-resource-search"
                type="search"
                placeholder="Search by name, code, or location"
                value={searchText}
                onChange={(event) => onSearchTextChange(event.target.value)}
                style={{
                  width: '100%',
                  height: 38,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--input-bg)',
                  border: '1.5px solid var(--input-border)',
                  padding: '0 14px 0 40px',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--input-text)',
                  outline: 'none',
                }}
              />
            </div>
            <div
              aria-label="Resource category filter"
              style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 2,
              }}
            >
              {[{ value: '', label: 'All' }, ...resourceCategoryOptions].map((option) => {
                const active = option.value === categoryFilter;
                return (
                  <button
                    key={option.value || 'all'}
                    type="button"
                    onClick={() => onCategoryFilterChange(option.value as ResourceCategory | '')}
                    style={{
                      border: `1px solid ${active ? 'var(--yellow-400)' : 'var(--border)'}`,
                      background: active ? 'rgba(238,202,68,.13)' : 'var(--surface-2)',
                      color: active ? 'var(--text-h)' : 'var(--text-muted)',
                      borderRadius: 999,
                      padding: '5px 9px',
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ maxHeight: menuPosition?.listMaxHeight ?? 230, overflowY: 'auto', overflowX: 'hidden', padding: '6px 0' }}>
            <button
              type="button"
              role="option"
              aria-selected={!selectedResource}
              onClick={() => selectResource('')}
              style={{
                width: '100%',
                border: 'none',
                background: !selectedResource ? 'rgba(238,202,68,.09)' : 'transparent',
                color: !selectedResource ? 'var(--text-h)' : 'var(--text-body)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                textAlign: 'left',
                fontFamily: 'var(--font-body)',
              }}
            >
              <span style={{ width: 16, flexShrink: 0, display: 'flex', color: 'var(--yellow-600)' }}>
                {!selectedResource && <Check size={14} strokeWidth={2.4} />}
              </span>
              <span style={{ fontSize: 13, fontWeight: 650 }}>No resource</span>
            </button>

            {resourcesToRender.length === 0 ? (
              <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                No resources match the filters
              </div>
            ) : (
              resourcesToRender.map((resource) => {
                const selected = selectedResource?.id === resource.id;
                const hiddenSelected = selectedHidden && selected;
                const details = [
                  resource.code,
                  getResourceCategoryLabel(resource.category),
                  resource.locationName,
                ]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <button
                    key={resource.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectResource(resource.id)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: selected ? 'rgba(238,202,68,.09)' : 'transparent',
                      color: selected ? 'var(--text-h)' : 'var(--text-body)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '9px 12px',
                      textAlign: 'left',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <span style={{ width: 16, flexShrink: 0, display: 'flex', color: 'var(--yellow-600)', paddingTop: 1 }}>
                      {selected && <Check size={14} strokeWidth={2.4} />}
                    </span>
                    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 650,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {hiddenSelected ? `Selected: ${resource.name}` : resource.name}
                      </span>
                      {details && (
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {details}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function SubmitTicketModal({ open, onClose, onSuccess }: SubmitTicketModalProps) {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;

  const [step, setStep] = React.useState(1);
  const [s1, setS1] = React.useState<Step1>(INIT_STEP1);
  const [s2, setS2] = React.useState<Step2>(INIT_STEP2);
  const [files, setFiles] = React.useState<StagedFile[]>([]);
  const [resources, setResources] = React.useState<ResourceOption[]>([]);
  const [resourcesLoading, setResourcesLoading] = React.useState(false);
  const [resourceLoadError, setResourceLoadError] = React.useState<string | null>(null);
  const [resourceCategoryFilter, setResourceCategoryFilter] = React.useState<ResourceCategory | ''>('');
  const [resourceSearch, setResourceSearch] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const deferredResourceSearch = React.useDeferredValue(resourceSearch);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    if (!accessToken) {
      setResources([]);
      setResourcesLoading(false);
      setResourceLoadError(null);
      return;
    }

    let cancelled = false;
    setResourcesLoading(true);
    setResourceLoadError(null);

    listResourceOptions(accessToken, { status: 'ACTIVE' })
      .then((nextResources) => {
        if (!cancelled) {
          setResources(nextResources);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResources([]);
          setResourceLoadError(getErrorMessage(err, 'Could not load resources.'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setResourcesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, open]);

  const selectedResource = React.useMemo(
    () => resources.find((resource) => resource.id === s2.resourceId) ?? null,
    [resources, s2.resourceId],
  );

  const filteredResources = React.useMemo(
    () =>
      resources.filter((resource) => {
        if (resourceCategoryFilter && resource.category !== resourceCategoryFilter) return false;
        return resourceMatchesSearch(resource, deferredResourceSearch);
      }),
    [deferredResourceSearch, resourceCategoryFilter, resources],
  );

  const resourceHelperText = resourceLoadError
    ?? (resourcesLoading
      ? 'Loading resources'
      : filteredResources.length === 0 && (resourceCategoryFilter || resourceSearch.trim())
        ? 'No resources match the filters'
        : `Optional · showing ${filteredResources.length} of ${resources.length} resources`);

  function reset() {
    setStep(1);
    setS1(INIT_STEP1);
    setS2(INIT_STEP2);
    setFiles([]);
    setResourceCategoryFilter('');
    setResourceSearch('');
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  function validateStep1(): string | null {
    if (!s1.title.trim()) return 'Title is required.';
    if (!s1.description.trim()) return 'Description is required.';
    if (!s1.category) return 'Category is required.';
    return null;
  }

  function handleNext() {
    setError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      setStep(2);
    } else if (step === 2) {
      if (!s2.priority) { setError('Priority is required.'); return; }
      setStep(3);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    const oversized = incoming.filter((f) => f.size > MAX_FILE_BYTES);
    if (oversized.length > 0) {
      setError(`${oversized.map((f) => f.name).join(', ')} exceed${oversized.length === 1 ? 's' : ''} the 10 MB limit.`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setError(null);
    const now = Date.now();
    setFiles((prev) => [
      ...prev,
      ...incoming.map((f, i) => ({ id: `${f.name}-${f.size}-${now + i}`, file: f })),
    ]);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit() {
    if (!accessToken) {
      setError('Session unavailable. Please sign in again.');
      return;
    }
    setSubmitting(true);
    setError(null);

    let ticketRef: string;
    try {
      const ticket = await createTicket(accessToken, {
        title: s1.title.trim(),
        description: s1.description.trim(),
        category: s1.category as TicketCategory,
        priority: s2.priority as TicketPriority,
        contactNote: s2.contactNote.trim() || undefined,
        resourceId: s2.resourceId || undefined,
      });
      ticketRef = ticket.ticketCode;
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the ticket. Please try again.'));
      setSubmitting(false);
      return;
    }

    let uploadFailed = false;
    for (const staged of files) {
      try {
        await uploadTicketAttachment(accessToken, ticketRef, staged.file);
      } catch {
        uploadFailed = true;
      }
    }

    setSubmitting(false);
    onSuccess();

    if (uploadFailed) {
      setError('Ticket created, but some attachments failed to upload.');
      return;
    }

    reset();
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Submit a Ticket" size="md">
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {([1, 2, 3] as const).map((s) => (
            <React.Fragment key={s}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: s < step ? 'var(--green-500)' : s === step ? 'var(--yellow-400)' : 'var(--surface-2)',
                    border: s > step ? '1.5px solid var(--border)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 800,
                    color: s === step ? 'var(--yellow-900)' : s < step ? '#fff' : 'var(--text-muted)',
                    flexShrink: 0,
                    transition: 'background .2s',
                  }}
                >
                  {s < step ? '✓' : s}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: s === step ? 700 : 400,
                    color: s === step ? 'var(--text-h)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '.04em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {STEP_LABELS[s - 1]}
                </span>
              </div>
              {s < 3 && (
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: s < step ? 'var(--green-500)' : 'var(--border)',
                    transition: 'background .2s',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <Alert variant="error" title="Error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Step 1 — Issue Details */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input
              id="st-title"
              label="Title"
              placeholder="Brief summary of the issue"
              value={s1.title}
              onChange={(e) => setS1((p) => ({ ...p, title: e.target.value }))}
              required
            />
            <Textarea
              id="st-description"
              label="Description"
              placeholder="Describe the issue in detail — location, when it started, what you observed"
              value={s1.description}
              onChange={(e) => setS1((p) => ({ ...p, description: e.target.value }))}
              rows={4}
              resize="none"
              required
            />
            <Select
              id="st-category"
              label="Category"
              value={s1.category}
              onChange={(e) => setS1((p) => ({ ...p, category: e.target.value as TicketCategory }))}
              placeholder="Select category"
              options={CATEGORY_OPTIONS}
            />
          </div>
        )}

        {/* Step 2 — Priority & Context */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Select
              id="st-priority"
              label="Priority"
              value={s2.priority}
              onChange={(e) => setS2((p) => ({ ...p, priority: e.target.value as TicketPriority }))}
              placeholder="Select priority"
              options={PRIORITY_OPTIONS}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <ResourcePickerDropdown
                selectedResource={selectedResource}
                filteredResources={filteredResources}
                categoryFilter={resourceCategoryFilter}
                searchText={resourceSearch}
                helperText={resourceHelperText}
                loading={resourcesLoading}
                loadError={resourceLoadError}
                onCategoryFilterChange={setResourceCategoryFilter}
                onSearchTextChange={setResourceSearch}
                onResourceChange={(resourceId) => setS2((p) => ({ ...p, resourceId }))}
              />
              <div>
                <Input
                  id="st-location"
                  label="Location"
                  placeholder=""
                  value={selectedResource?.locationName ?? ''}
                  onChange={() => undefined}
                  disabled
                />
              </div>
            </div>
            <Input
              id="st-contact"
              label="Contact Note"
              placeholder="Best way to reach you (optional)"
              value={s2.contactNote}
              onChange={(e) => setS2((p) => ({ ...p, contactNote: e.target.value }))}
            />
          </div>
        )}

        {/* Step 3 — Attachments */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>
                Attachments{' '}
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>(optional)</span>
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)' }}>
                Photos or documents to help describe the issue. Max 10 MB per file.
              </p>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="subtle"
                size="sm"
                iconLeft={<Upload size={13} />}
                onClick={() => fileRef.current?.click()}
              >
                Choose Files
              </Button>
            </div>

            {files.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {files.map((staged) => (
                  <div
                    key={staged.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  >
                    <Paperclip size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: 'var(--text-body)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {staged.file.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {formatBytes(staged.file.size)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${staged.file.name}`}
                      onClick={() => setFiles((prev) => prev.filter((f) => f.id !== staged.id))}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 2,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                No files selected. You can submit without attachments.
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setError(null); setStep((s) => s - 1); }}
                disabled={submitting}
              >
                Back
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" variant="subtle" size="sm" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button type="button" size="sm" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                loading={submitting}
                iconLeft={<TicketPlus size={14} />}
                onClick={() => void handleSubmit()}
              >
                Submit Ticket
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
