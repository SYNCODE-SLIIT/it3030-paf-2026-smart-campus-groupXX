'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Download, FileText, RefreshCw, Upload, Users, XCircle } from 'lucide-react';

import { Alert, Button, Chip, Dialog, Textarea } from '@/components/ui';
import { getErrorMessage, importBulkStudents, previewBulkStudentImport } from '@/lib/api-client';
import type {
  BulkStudentImportEntry,
  BulkStudentImportResponse,
  BulkStudentImportRowResult,
  BulkStudentImportStatus,
} from '@/lib/api-types';

const MAX_IMPORT_ROWS = 500;
const TEMPLATE_CONTENT = 'email\nstudent1@campus.test\nstudent2@campus.test\n';

type ImportStep = 'add' | 'review' | 'complete';

const stepLabels: Record<ImportStep, string> = {
  add: 'Add emails',
  review: 'Review',
  complete: 'Complete',
};

const statusLabel: Record<BulkStudentImportStatus, string> = {
  VALID: 'Ready',
  CREATED: 'Created',
  INVALID_EMAIL: 'Invalid',
  DUPLICATE_IN_FILE: 'Duplicate',
  ALREADY_EXISTS: 'Exists',
  FAILED: 'Failed',
};

const statusColor: Record<BulkStudentImportStatus, 'yellow' | 'red' | 'green' | 'blue' | 'orange' | 'neutral'> = {
  VALID: 'blue',
  CREATED: 'green',
  INVALID_EMAIL: 'red',
  DUPLICATE_IN_FILE: 'orange',
  ALREADY_EXISTS: 'neutral',
  FAILED: 'red',
};

function parseDelimitedLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && (char === ',' || char === ';' || char === '\t')) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseEmailRows(source: string): BulkStudentImportEntry[] {
  const normalizedSource = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const hasMultipleLines = normalizedSource.includes('\n');
  const rows: BulkStudentImportEntry[] = [];

  normalizedSource.split('\n').forEach((line, lineIndex) => {
    const cells = parseDelimitedLine(line)
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (cells.length === 0) return;

    if (rows.length === 0 && cells[0].toLowerCase() === 'email') {
      return;
    }

    cells.forEach((email) => {
      rows.push({
        rowNumber: hasMultipleLines ? lineIndex + 1 : rows.length + 1,
        email,
      });
    });
  });

  return rows;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function buildErrorCsv(rows: BulkStudentImportRowResult[]) {
  const reportRows = rows.filter((row) => row.status !== 'CREATED');
  const lines = [
    ['rowNumber', 'email', 'status', 'message'].join(','),
    ...reportRows.map((row) => [
      escapeCsvValue(row.rowNumber),
      escapeCsvValue(row.email),
      escapeCsvValue(row.status),
      escapeCsvValue(row.message),
    ].join(',')),
  ];
  return `${lines.join('\n')}\n`;
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'green' | 'blue' | 'orange' | 'red' | 'neutral';
}) {
  const colorMap = {
    green: 'var(--green-500)',
    blue: 'var(--blue-500)',
    orange: 'var(--orange-500)',
    red: 'var(--red-500)',
    neutral: 'var(--text-muted)',
  };

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface-2)',
        padding: '14px 16px',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          fontWeight: 800,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: '6px 0 0',
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 900,
          color: colorMap[tone],
        }}
      >
        {value}
      </p>
    </div>
  );
}

function ImportSteps({ step }: { step: ImportStep }) {
  const orderedSteps: ImportStep[] = ['add', 'review', 'complete'];
  const activeIndex = orderedSteps.indexOf(step);

  return (
    <div className="bulk-import-steps">
      {orderedSteps.map((item, index) => {
        const isActive = item === step;
        const isComplete = index < activeIndex;
        return (
          <span
            key={item}
            className={`bulk-import-step${isActive ? ' active' : ''}${isComplete ? ' done' : ''}`}
          >
            {isComplete ? <CheckCircle2 size={13} /> : <span>{index + 1}</span>}
            {stepLabels[item]}
          </span>
        );
      })}
    </div>
  );
}

function ImportResultTable({ rows }: { rows: BulkStudentImportRowResult[] }) {
  return (
    <div className="bulk-import-table-shell">
      <table className="bulk-import-table">
        <thead>
          <tr>
            <th>Row</th>
            <th>Email</th>
            <th>Status</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.rowNumber}-${row.email}-${index}`}>
              <td>{row.rowNumber}</td>
              <td>{row.normalizedEmail ?? row.email}</td>
              <td>
                <Chip color={statusColor[row.status]} size="sm" dot>
                  {statusLabel[row.status]}
                </Chip>
              </td>
              <td>{row.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BulkStudentImportDialog({
  open,
  accessToken,
  onClose,
  onImported,
}: {
  open: boolean;
  accessToken: string | null;
  onClose: () => void;
  onImported: (response: BulkStudentImportResponse) => Promise<void>;
}) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [step, setStep] = React.useState<ImportStep>('add');
  const [rawInput, setRawInput] = React.useState('');
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [previewResult, setPreviewResult] = React.useState<BulkStudentImportResponse | null>(null);
  const [importResult, setImportResult] = React.useState<BulkStudentImportResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);

  const parsedRows = React.useMemo(() => parseEmailRows(rawInput), [rawInput]);
  const canPreview = parsedRows.length > 0 && parsedRows.length <= MAX_IMPORT_ROWS && !isPreviewing;
  const canImport = !!previewResult && previewResult.summary.validRows > 0 && !isImporting;

  React.useEffect(() => {
    if (!open) return;

    setStep('add');
    setRawInput('');
    setFileName(null);
    setPreviewResult(null);
    setImportResult(null);
    setError(null);
    setDragActive(false);
    setIsPreviewing(false);
    setIsImporting(false);
  }, [open]);

  async function handleFile(file: File) {
    const content = await file.text();
    setRawInput(content);
    setFileName(file.name);
    setPreviewResult(null);
    setImportResult(null);
    setError(null);
    setStep('add');
  }

  async function handlePreview() {
    if (!accessToken) {
      setError('The admin session is unavailable. Please sign in again.');
      return;
    }

    if (parsedRows.length === 0) {
      setError('Add at least one student email before previewing.');
      return;
    }

    if (parsedRows.length > MAX_IMPORT_ROWS) {
      setError(`Student imports are limited to ${MAX_IMPORT_ROWS} rows per request.`);
      return;
    }

    setIsPreviewing(true);
    setError(null);
    try {
      const result = await previewBulkStudentImport(accessToken, { students: parsedRows });
      setPreviewResult(result);
      setStep('review');
    } catch (previewError) {
      setError(getErrorMessage(previewError, 'We could not preview this import.'));
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleImport() {
    if (!accessToken || !previewResult) {
      setError('The admin session is unavailable. Please sign in again.');
      return;
    }

    setIsImporting(true);
    setError(null);
    try {
      const result = await importBulkStudents(accessToken, { students: parsedRows });
      setImportResult(result);
      setStep('complete');
      await onImported(result);
    } catch (importError) {
      setError(getErrorMessage(importError, 'We could not import these students.'));
    } finally {
      setIsImporting(false);
    }
  }

  const completionRows = importResult?.results ?? [];
  const hasErrorReport = completionRows.some((row) => row.status !== 'CREATED');

  return (
    <Dialog open={open} onClose={isImporting ? () => {} : onClose} title="Import Students" size="lg" closeOnBackdropClick={!isImporting}>
      <style>{`
        .bulk-import-shell {
          display: grid;
          gap: 18px;
          padding: 22px;
        }
        .bulk-import-steps {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .bulk-import-step {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 7px 11px;
          color: var(--text-muted);
          background: var(--surface-2);
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 800;
        }
        .bulk-import-step > span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: var(--surface);
          color: inherit;
          font-size: 10px;
        }
        .bulk-import-step.active {
          border-color: rgba(238,202,68,.42);
          color: var(--yellow-700);
          background: rgba(238,202,68,.1);
        }
        .bulk-import-step.done {
          border-color: var(--green-200);
          color: var(--green-600);
          background: var(--green-50);
        }
        .bulk-import-dropzone {
          position: relative;
          display: grid;
          place-items: center;
          min-height: 150px;
          border: 1.5px dashed var(--border-strong);
          border-radius: var(--radius-xl);
          background:
            radial-gradient(circle at 20% 20%, rgba(238,202,68,.13), transparent 28%),
            radial-gradient(circle at 85% 15%, rgba(43,109,232,.1), transparent 26%),
            var(--surface-2);
          padding: 22px;
          text-align: center;
          transition: border-color .16s, transform .16s, background .16s;
        }
        .bulk-import-dropzone.active {
          border-color: var(--yellow-500);
          transform: translateY(-1px);
        }
        .bulk-import-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 10px;
        }
        .bulk-import-table-shell {
          max-height: 280px;
          overflow: auto;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
        }
        .bulk-import-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 620px;
        }
        .bulk-import-table th,
        .bulk-import-table td {
          padding: 11px 12px;
          border-bottom: 1px solid var(--border);
          text-align: left;
          font-size: 12px;
          vertical-align: top;
        }
        .bulk-import-table th {
          position: sticky;
          top: 0;
          background: var(--surface-2);
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 8px;
          letter-spacing: .16em;
          text-transform: uppercase;
          z-index: 1;
        }
        .bulk-import-table td {
          color: var(--text-body);
        }
        .bulk-import-table tbody tr:last-child td {
          border-bottom: none;
        }
      `}</style>

      <div className="bulk-import-shell">
        <ImportSteps step={step} />

        {error && (
          <Alert variant="error" title="Import unavailable">
            {error}
          </Alert>
        )}

        {step === 'add' && (
          <>
            <div
              className={`bulk-import-dropzone${dragActive ? ' active' : ''}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                const file = event.dataTransfer.files?.[0];
                if (file) {
                  void handleFile(file);
                }
              }}
            >
              <div style={{ display: 'grid', justifyItems: 'center', gap: 10, maxWidth: 430 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    width: 46,
                    height: 46,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 18,
                    background: 'rgba(238,202,68,.16)',
                    color: 'var(--yellow-700)',
                  }}
                >
                  <Upload size={21} />
                </span>
                <div>
                  <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, color: 'var(--text-h)' }}>
                    Drop a CSV or paste student emails
                  </p>
                  <p style={{ margin: '5px 0 0', color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.55 }}>
                    Use one email per row, or paste a comma-separated list. Optional header: email.
                  </p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    style={{ display: 'none' }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleFile(file);
                      }
                      event.currentTarget.value = '';
                    }}
                  />
                  <Button variant="subtle" size="sm" iconLeft={<FileText size={13} />} onClick={() => fileInputRef.current?.click()}>
                    Choose File
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<Download size={13} />}
                    onClick={() => downloadTextFile('student-import-template.csv', TEMPLATE_CONTENT)}
                  >
                    Template
                  </Button>
                </div>
                {fileName && (
                  <Chip color="blue" size="sm">
                    {fileName}
                  </Chip>
                )}
              </div>
            </div>

            <Textarea
              label="Student emails"
              value={rawInput}
              onChange={(event) => {
                setRawInput(event.target.value);
                setPreviewResult(null);
                setImportResult(null);
                setError(null);
                setFileName(null);
              }}
              placeholder={'email\nstudent1@campus.test\nstudent2@campus.test'}
              rows={8}
              resize="vertical"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6 }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <span style={{ color: parsedRows.length > MAX_IMPORT_ROWS ? 'var(--red-500)' : 'var(--text-muted)', fontSize: 12 }}>
                {parsedRows.length} parsed row{parsedRows.length === 1 ? '' : 's'} / {MAX_IMPORT_ROWS} max
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button variant="ghost" size="sm" onClick={onClose} disabled={isPreviewing}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  iconLeft={<Users size={14} />}
                  loading={isPreviewing}
                  disabled={!canPreview}
                  onClick={() => {
                    void handlePreview();
                  }}
                >
                  Preview Import
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'review' && previewResult && (
          <>
            <div className="bulk-import-summary">
              <SummaryCard label="Ready" value={previewResult.summary.validRows} tone="blue" />
              <SummaryCard label="Invalid" value={previewResult.summary.invalidRows} tone="red" />
              <SummaryCard label="Duplicates" value={previewResult.summary.duplicateRows} tone="orange" />
              <SummaryCard label="Existing" value={previewResult.summary.existingRows} tone="neutral" />
            </div>

            {previewResult.summary.validRows === 0 ? (
              <Alert variant="warning" title="No importable rows" icon={<AlertTriangle size={16} />}>
                Fix the rows below or add new student emails before continuing.
              </Alert>
            ) : (
              <Alert variant="info" title="Ready to import">
                {previewResult.summary.validRows} student account{previewResult.summary.validRows === 1 ? '' : 's'} will be created and invited.
              </Alert>
            )}

            <ImportResultTable rows={previewResult.results} />

            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <Button variant="ghost" size="sm" iconLeft={<RefreshCw size={13} />} disabled={isImporting} onClick={() => setStep('add')}>
                Edit List
              </Button>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button variant="ghost" size="sm" disabled={isImporting} onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  iconLeft={<CheckCircle2 size={14} />}
                  loading={isImporting}
                  disabled={!canImport}
                  onClick={() => {
                    void handleImport();
                  }}
                >
                  Import and Send Invites
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'complete' && importResult && (
          <>
            <div className="bulk-import-summary">
              <SummaryCard label="Created" value={importResult.summary.createdRows} tone="green" />
              <SummaryCard label="Skipped" value={importResult.summary.skippedRows} tone="orange" />
              <SummaryCard label="Failed" value={importResult.summary.failedRows} tone="red" />
              <SummaryCard label="Total Rows" value={importResult.summary.totalRows} tone="neutral" />
            </div>

            {importResult.summary.failedRows > 0 ? (
              <Alert variant="warning" title="Import completed with issues" icon={<AlertTriangle size={16} />}>
                Some rows could not be created. Download the report, fix the rows, and import them again.
              </Alert>
            ) : (
              <Alert variant="success" title="Import complete" icon={<CheckCircle2 size={16} />}>
                Student accounts were created and invite emails were queued for delivery.
              </Alert>
            )}

            <ImportResultTable rows={importResult.results} />

            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <Button
                variant="subtle"
                size="sm"
                iconLeft={<XCircle size={13} />}
                disabled={!hasErrorReport}
                onClick={() => downloadTextFile('student-import-report.csv', buildErrorCsv(completionRows))}
              >
                Download Error CSV
              </Button>
              <Button variant="primary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
