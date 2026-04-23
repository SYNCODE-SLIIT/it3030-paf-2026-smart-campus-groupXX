'use client';

import React from 'react';

import {
  getErrorMessage,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/api-client';
import type {
  NotificationPreferenceCategoryResponse,
  NotificationPreferencesResponse,
} from '@/lib/api-types';

export function useNotificationPreferences(accessToken: string | null) {
  const [preferences, setPreferences] = React.useState<NotificationPreferencesResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadPreferences = React.useCallback(async (force = false) => {
    if (!accessToken) {
      const message = 'Please sign in again to manage notification preferences.';
      setError(message);
      setPreferences(null);
      return null;
    }

    if (!force && preferences) {
      setError(null);
      return preferences;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getNotificationPreferences(accessToken);
      setPreferences(response);
      return response;
    } catch (loadError) {
      setPreferences(null);
      setError(getErrorMessage(loadError, 'Could not load notification preferences.'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [accessToken, preferences]);

  const savePreferences = React.useCallback(async (categories: NotificationPreferenceCategoryResponse[]) => {
    if (!accessToken) {
      throw new Error('Please sign in again to update notification preferences.');
    }

    setSaving(true);
    setError(null);
    try {
      const response = await updateNotificationPreferences(accessToken, {
        categories: categories.map((category) => ({
          domain: category.domain,
          inAppEnabled: category.inAppEnabled,
          emailEnabled: category.emailEnabled,
        })),
      });
      setPreferences(response);
      return response;
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Could not save notification preferences.'));
      throw saveError;
    } finally {
      setSaving(false);
    }
  }, [accessToken]);

  return {
    preferences,
    loading,
    saving,
    error,
    loaded: preferences !== null,
    loadPreferences,
    savePreferences,
  };
}
