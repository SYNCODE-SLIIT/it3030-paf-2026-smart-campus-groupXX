'use client';

import React from 'react';

import { RequesterBookingsScreenEnhanced } from '@/components/screens/RequesterBookingsScreenEnhanced';

export function RequesterBookingsScreen({
  workspaceLabel,
}: {
  workspaceLabel: 'Student Workspace' | 'Faculty Workspace';
}) {
  return <RequesterBookingsScreenEnhanced workspaceLabel={workspaceLabel} />;
}
