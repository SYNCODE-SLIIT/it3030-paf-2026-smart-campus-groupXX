'use client';

import React from 'react';
import { Paperclip, TicketPlus, Trash2, Upload } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Dialog, Input, Select, Textarea } from '@/components/ui';
import { createTicket, getErrorMessage, listResources, uploadTicketAttachment } from '@/lib/api-client';
import type { ResourceResponse, TicketCategory, TicketPriority } from '@/lib/api-types';

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

export function SubmitTicketModal({ open, onClose, onSuccess }: SubmitTicketModalProps) {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;

  const [step, setStep] = React.useState(1);
  const [s1, setS1] = React.useState<Step1>(INIT_STEP1);
  const [s2, setS2] = React.useState<Step2>(INIT_STEP2);
  const [files, setFiles] = React.useState<StagedFile[]>([]);
  const [resources, setResources] = React.useState<ResourceResponse[]>([]);
  const [resourcesLoading, setResourcesLoading] = React.useState(false);
  const [resourceLoadError, setResourceLoadError] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
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

    listResources(accessToken)
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

  const resourceOptions = React.useMemo(
    () => [
      { value: '', label: 'No resource' },
      ...resources.map((resource) => ({ value: resource.id, label: resource.name })),
    ],
    [resources],
  );

  const selectedResource = React.useMemo(
    () => resources.find((resource) => resource.id === s2.resourceId) ?? null,
    [resources, s2.resourceId],
  );

  function reset() {
    setStep(1);
    setS1(INIT_STEP1);
    setS2(INIT_STEP2);
    setFiles([]);
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Select
                  id="st-resource"
                  label="Resource"
                  value={s2.resourceId}
                  onChange={(e) => setS2((p) => ({ ...p, resourceId: e.target.value }))}
                  options={resourceOptions}
                  disabled={resourcesLoading || Boolean(resourceLoadError)}
                />
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                  {resourceLoadError ?? (resourcesLoading ? 'Loading resources' : 'Optional')}
                </p>
              </div>
              <div>
                <Input
                  id="st-location"
                  label="Location"
                  placeholder=""
                  value={selectedResource?.locationDetails?.locationName ?? ''}
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
