'use client';

import React from 'react';

import { Checkbox } from '@/components/ui';
import type { ManagerRole } from '@/lib/api-types';

const managerRoleOptions: Array<{ value: ManagerRole; label: string }> = [
  { value: 'CATALOG_MANAGER', label: 'Catalog Manager' },
  { value: 'BOOKING_MANAGER', label: 'Booking Manager' },
  { value: 'TICKET_MANAGER', label: 'Ticket Manager' },
];

export function RoleCheckboxGroup({
  value,
  onChange,
}: {
  value: ManagerRole[];
  onChange: (roles: ManagerRole[]) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {managerRoleOptions.map((roleOption) => {
        const checked = value.includes(roleOption.value);

        return (
          <Checkbox
            key={roleOption.value}
            checked={checked}
            label={roleOption.label}
            onChange={(event) => {
              if (event.target.checked) {
                onChange([...value, roleOption.value]);
              } else {
                onChange(value.filter((role) => role !== roleOption.value));
              }
            }}
          />
        );
      })}
    </div>
  );
}
