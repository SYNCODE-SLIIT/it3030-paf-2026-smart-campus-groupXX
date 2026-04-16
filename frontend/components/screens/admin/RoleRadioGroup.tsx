'use client';

import React from 'react';

import { Radio } from '@/components/ui';
import type { ManagerRole } from '@/lib/api-types';

export const managerRoleOptions: Array<{ value: ManagerRole; label: string }> = [
  { value: 'CATALOG_MANAGER', label: 'Catalog Manager' },
  { value: 'BOOKING_MANAGER', label: 'Booking Manager' },
  { value: 'TICKET_MANAGER', label: 'Ticket Manager' },
];

export function RoleRadioGroup({
  value,
  onChange,
}: {
  value: ManagerRole | '';
  onChange: (role: ManagerRole) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {managerRoleOptions.map((roleOption) => (
        <Radio
          key={roleOption.value}
          checked={value === roleOption.value}
          label={roleOption.label}
          name="manager-role"
          onChange={() => onChange(roleOption.value)}
        />
      ))}
    </div>
  );
}
