'use client';

import React from 'react';
import { ArrowRight, GraduationCap } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip, GlassPill, Input, Select, Skeleton, Toggle } from '@/components/ui';
import {
  completeStudentOnboarding,
  getErrorMessage,
  getStudentOnboarding,
} from '@/lib/api-client';
import type { StudentOnboardingRequest, UserResponse } from '@/lib/api-types';
import { getUserTypeLabel } from '@/lib/user-display';

const academicYearOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: `Year ${index + 1}`,
}));

interface OnboardingFormState {
  firstName: string;
  lastName: string;
  preferredName: string;
  phoneNumber: string;
  registrationNumber: string;
  facultyName: string;
  programName: string;
  academicYear: string;
  semester: string;
  profileImageUrl: string;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
}

function toFormState(profile: UserResponse['studentProfile']): OnboardingFormState {
  return {
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    preferredName: profile?.preferredName ?? '',
    phoneNumber: profile?.phoneNumber ?? '',
    registrationNumber: profile?.registrationNumber ?? '',
    facultyName: profile?.facultyName ?? '',
    programName: profile?.programName ?? '',
    academicYear: profile?.academicYear ? String(profile.academicYear) : '',
    semester: profile?.semester ?? '',
    profileImageUrl: profile?.profileImageUrl ?? '',
    emailNotificationsEnabled: profile?.emailNotificationsEnabled ?? true,
    smsNotificationsEnabled: profile?.smsNotificationsEnabled ?? false,
  };
}

export function StudentOnboardingScreen({ user }: { user?: UserResponse }) {
  const { session, refreshMe, appUser } = useAuth();
  const resolvedUser = user ?? appUser ?? null;
  const [formState, setFormState] = React.useState<OnboardingFormState>(() =>
    toFormState(resolvedUser?.studentProfile ?? null),
  );
  const [loadingState, setLoadingState] = React.useState(true);
  const [alert, setAlert] = React.useState<{
    variant: 'error' | 'success' | 'info' | 'warning' | 'neutral';
    title: string;
    message: string;
  } | null>(null);
  const [isSubmitting, startSubmitTransition] = React.useTransition();

  React.useEffect(() => {
    if (resolvedUser) {
      setFormState(toFormState(resolvedUser.studentProfile));
    }
  }, [resolvedUser]);

  React.useEffect(() => {
    if (!session?.access_token || !resolvedUser) {
      return;
    }

    let cancelled = false;

    const loadState = async () => {
      try {
        const onboardingState = await getStudentOnboarding(session.access_token);

        if (cancelled) {
          return;
        }

        if (onboardingState.onboardingCompleted) {
          window.location.assign('/');
          return;
        }

        setFormState(toFormState(onboardingState.profile));
      } catch (error) {
        if (!cancelled) {
          setAlert({
            variant: 'error',
            title: 'Unable to load onboarding',
            message: getErrorMessage(error, 'We could not load your onboarding state right now.'),
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingState(false);
        }
      }
    };

    void loadState();

    return () => {
      cancelled = true;
    };
  }, [resolvedUser, session?.access_token]);

  if (!resolvedUser) {
    return null;
  }

  function setField<K extends keyof OnboardingFormState>(field: K, value: OnboardingFormState[K]) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.access_token) {
      setAlert({
        variant: 'error',
        title: 'Session expired',
        message: 'Please sign in again before completing onboarding.',
      });
      return;
    }

    if (!formState.firstName || !formState.lastName || !formState.phoneNumber || !formState.registrationNumber) {
      setAlert({
        variant: 'error',
        title: 'Missing required fields',
        message: 'Please complete all required fields before submitting onboarding.',
      });
      return;
    }

    if (!formState.facultyName || !formState.programName || !formState.academicYear) {
      setAlert({
        variant: 'error',
        title: 'Academic details required',
        message: 'Faculty, program, and academic year are required for student onboarding.',
      });
      return;
    }

    startSubmitTransition(async () => {
      try {
        const payload: StudentOnboardingRequest = {
          firstName: formState.firstName.trim(),
          lastName: formState.lastName.trim(),
          preferredName: formState.preferredName.trim() || undefined,
          phoneNumber: formState.phoneNumber.trim(),
          registrationNumber: formState.registrationNumber.trim(),
          facultyName: formState.facultyName.trim(),
          programName: formState.programName.trim(),
          academicYear: Number(formState.academicYear),
          semester: formState.semester.trim() || undefined,
          profileImageUrl: formState.profileImageUrl.trim() || undefined,
          emailNotificationsEnabled: formState.emailNotificationsEnabled,
          smsNotificationsEnabled: formState.smsNotificationsEnabled,
        };

        await completeStudentOnboarding(session.access_token, payload);
        await refreshMe();

        // Use a full navigation so role/onboarding guards rehydrate from the latest backend state.
        window.location.assign('/');
      } catch (error) {
        setAlert({
          variant: 'error',
          title: 'Onboarding failed',
          message: getErrorMessage(error, 'We could not complete onboarding.'),
        });
      }
    });
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '24px 20px 40px',
        background:
          'radial-gradient(circle at top right, rgba(238,202,68,.18), transparent 28%), linear-gradient(180deg, var(--bg-subtle) 0%, var(--bg) 100%)',
      }}
    >
      <style>{`
        .onboarding-shell {
          max-width: 980px;
          margin: 0 auto;
          display: grid;
          gap: 18px;
        }

        .onboarding-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 980px) {
          .onboarding-shell,
          .onboarding-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="onboarding-shell">
        <GlassPill
          style={{
            padding: '16px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--text-h)',
              }}
            >
              Student onboarding
            </p>
            <p style={{ marginTop: 4, fontSize: 13.5, color: 'var(--text-body)' }}>
              Complete the required profile fields to activate your account.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Chip color="yellow" dot>
              {getUserTypeLabel(resolvedUser.userType)}
            </Chip>
            <Chip color="glass">{resolvedUser.email}</Chip>
          </div>
        </GlassPill>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ color: 'var(--yellow-500)', display: 'flex' }}>
              <GraduationCap size={20} />
            </span>
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--text-h)',
                }}
              >
                Student Profile
              </p>
            </div>
          </div>

          {alert && (
            <Alert variant={alert.variant} title={alert.title} style={{ marginBottom: 16 }}>
              {alert.message}
            </Alert>
          )}

          {loadingState ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton variant="line" height={20} width="45%" />
              <Skeleton variant="rect" height={52} />
              <Skeleton variant="rect" height={52} />
              <Skeleton variant="rect" height={200} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="onboarding-form-grid">
                <Input label="Email" value={resolvedUser.email} disabled />
                <Input label="User Type" value={getUserTypeLabel(resolvedUser.userType)} disabled />
                <Input
                  label="First Name"
                  value={formState.firstName}
                  onChange={(event) => setField('firstName', event.target.value)}
                  required
                />
                <Input
                  label="Last Name"
                  value={formState.lastName}
                  onChange={(event) => setField('lastName', event.target.value)}
                  required
                />
                <Input
                  label="Preferred Name"
                  value={formState.preferredName}
                  onChange={(event) => setField('preferredName', event.target.value)}
                />
                <Input
                  label="Phone Number"
                  value={formState.phoneNumber}
                  onChange={(event) => setField('phoneNumber', event.target.value)}
                  required
                />
                <Input
                  label="Registration Number"
                  value={formState.registrationNumber}
                  onChange={(event) => setField('registrationNumber', event.target.value)}
                  required
                />
                <Input
                  label="Faculty / School"
                  value={formState.facultyName}
                  onChange={(event) => setField('facultyName', event.target.value)}
                  required
                />
                <Input
                  label="Program"
                  value={formState.programName}
                  onChange={(event) => setField('programName', event.target.value)}
                  required
                />
                <Select
                  label="Academic Year"
                  value={formState.academicYear}
                  onChange={(event) => setField('academicYear', event.target.value)}
                  options={academicYearOptions}
                  placeholder="Choose year"
                  required
                />
                <Input
                  label="Semester"
                  value={formState.semester}
                  onChange={(event) => setField('semester', event.target.value)}
                />
                <Input
                  label="Profile Image URL"
                  value={formState.profileImageUrl}
                  onChange={(event) => setField('profileImageUrl', event.target.value)}
                  hint="Optional URL because the current backend contract accepts profileImageUrl."
                />
              </div>

              <GlassPill
                style={{
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8.5,
                    letterSpacing: '.18em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}
                >
                  Notification Preferences
                </p>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  <Toggle
                    label="Email notifications"
                    checked={formState.emailNotificationsEnabled}
                    onChange={(checked) => setField('emailNotificationsEnabled', checked)}
                  />
                  <Toggle
                    label="SMS notifications"
                    checked={formState.smsNotificationsEnabled}
                    onChange={(checked) => setField('smsNotificationsEnabled', checked)}
                  />
                </div>
              </GlassPill>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="glass"
                  size="lg"
                  loading={isSubmitting}
                  iconRight={!isSubmitting ? <ArrowRight size={16} /> : undefined}
                >
                  Complete Onboarding
                </Button>
              </div>
            </form>
          )}
        </Card>

      </div>
    </div>
  );
}
