'use client';

import React from 'react';
import { ChevronDown, User, UserCheck } from 'lucide-react';
import { Button, DropdownMenu } from '@/components/ui';
import type { TicketResponse, UserResponse } from '@/lib/api-types';
import { getManagerDisplayName } from './ticketDetailHelpers';
import { ReassignConfirmDialog } from './ReassignConfirmDialog';

interface AssignmentDropdownButtonProps {
  ticket: TicketResponse;
  managers: UserResponse[];
  appUserId: string;
  appUserName?: string;
  assigning: boolean;
  onAssign: (userId: string) => void;
}

export function AssignmentDropdownButton({
  ticket,
  managers,
  appUserId,
  appUserName,
  assigning,
  onAssign,
}: AssignmentDropdownButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [pendingUserId, setPendingUserId] = React.useState<string | null>(null);
  const [reassignOpen, setReassignOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const isLocked = ticket.status !== 'OPEN';
  const currentLabel = ticket.assignedToName ?? 'Unassigned';

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  function handleSelect(userId: string) {
    setOpen(false);
    if (userId === ticket.assignedToId) return;
    if (!ticket.assignedToId) {
      onAssign(userId);
      return;
    }
    // Already assigned → confirmation needed
    setPendingUserId(userId);
    setReassignOpen(true);
  }

  function handleConfirmReassign() {
    if (!pendingUserId) return;
    onAssign(pendingUserId);
    setReassignOpen(false);
    setPendingUserId(null);
  }

  function handleCancelReassign() {
    setReassignOpen(false);
    setPendingUserId(null);
  }

  const pendingName = pendingUserId
    ? pendingUserId === appUserId
      ? appUserName ?? 'yourself'
      : getManagerDisplayName(managers.find((m) => m.id === pendingUserId)!) || 'the selected manager'
    : '';

  const dropdownItems = [
    ...managers.map((m) => ({
      label: getManagerDisplayName(m),
      icon: User,
      onClick: () => handleSelect(m.id),
    })),
    {
      label: appUserName ? `Assign to myself (${appUserName})` : 'Assign to myself',
      icon: UserCheck,
      dividerBefore: true,
      onClick: () => handleSelect(appUserId),
    },
  ];

  return (
    <>
      <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
        <Button
          variant="subtle"
          size="sm"
          iconRight={<ChevronDown size={13} />}
          disabled={isLocked}
          loading={assigning}
          onClick={() => setOpen((v) => !v)}
        >
          {isLocked
            ? currentLabel
            : ticket.assignedToId
            ? `Reassign: ${currentLabel}`
            : 'Assign Ticket'}
        </Button>
        <DropdownMenu items={dropdownItems} open={open} direction="down" />
      </div>

      <ReassignConfirmDialog
        open={reassignOpen}
        currentAssigneeName={ticket.assignedToName ?? ticket.assignedToEmail ?? 'current assignee'}
        newAssigneeName={pendingName}
        assigning={assigning}
        onClose={handleCancelReassign}
        onConfirm={handleConfirmReassign}
      />
    </>
  );
}
