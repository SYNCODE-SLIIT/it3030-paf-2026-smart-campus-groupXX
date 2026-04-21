'use client';

import React from 'react';
import { ImageUp, Mail, MessageSquare, X } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Avatar, Button, Chip, Input, Select, Skeleton, Toggle } from '@/components/ui';
import {
  completeStudentOnboarding,
  getErrorMessage,
  getStudentOnboarding,
  uploadStudentProfileImage,
} from '@/lib/api-client';
import { getUserHomePath } from '@/lib/auth-routing';
import type {
  AcademicYear,
  Semester,
  StudentFaculty,
  StudentOnboardingRequest,
  StudentProgram,
  UserResponse,
} from '@/lib/api-types';
import {
  academicYearOptions,
  facultyOptions,
  programBelongsToFaculty,
  programOptionsByFaculty,
  semesterOptions,
} from '@/lib/student-catalog';

type PhoneCountryCode = 'US' | 'LK' | 'GB' | 'IN' | 'AU' | 'SG' | 'MY' | 'AE' | 'DE' | 'JP';

interface PhoneCountryOption {
  code: PhoneCountryCode;
  name: string;
  flag: string;
  dialCode: string;
  minNationalDigits: number;
  maxNationalDigits: number;
}

const DEFAULT_PHONE_COUNTRY: PhoneCountryCode = 'US';

const PHONE_COUNTRIES: PhoneCountryOption[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1', minNationalDigits: 10, maxNationalDigits: 10 },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', dialCode: '+94', minNationalDigits: 9, maxNationalDigits: 9 },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44', minNationalDigits: 9, maxNationalDigits: 10 },
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91', minNationalDigits: 10, maxNationalDigits: 10 },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61', minNationalDigits: 9, maxNationalDigits: 9 },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dialCode: '+65', minNationalDigits: 8, maxNationalDigits: 8 },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dialCode: '+60', minNationalDigits: 9, maxNationalDigits: 10 },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dialCode: '+971', minNationalDigits: 9, maxNationalDigits: 9 },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dialCode: '+49', minNationalDigits: 10, maxNationalDigits: 11 },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', dialCode: '+81', minNationalDigits: 9, maxNationalDigits: 10 },
];

const PHONE_COUNTRY_BY_CODE = PHONE_COUNTRIES.reduce<Record<PhoneCountryCode, PhoneCountryOption>>((map, country) => {
  map[country.code] = country;
  return map;
}, {} as Record<PhoneCountryCode, PhoneCountryOption>);

const PHONE_COUNTRIES_BY_DIAL_LENGTH = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, '');
}

function parsePhoneForForm(rawPhoneNumber: string | null | undefined): {
  countryCode: PhoneCountryCode;
  nationalNumber: string;
} {
  const compactDigits = normalizePhoneDigits(rawPhoneNumber?.trim() ?? '');

  if (!compactDigits) {
    return { countryCode: DEFAULT_PHONE_COUNTRY, nationalNumber: '' };
  }

  for (const country of PHONE_COUNTRIES_BY_DIAL_LENGTH) {
    const dialDigits = normalizePhoneDigits(country.dialCode);
    if (compactDigits.startsWith(dialDigits) && compactDigits.length > dialDigits.length) {
      return {
        countryCode: country.code,
        nationalNumber: compactDigits.slice(dialDigits.length),
      };
    }
  }

  return {
    countryCode: DEFAULT_PHONE_COUNTRY,
    nationalNumber: compactDigits,
  };
}

function formatPhoneForSubmit(countryCode: PhoneCountryCode, nationalNumber: string) {
  const country = PHONE_COUNTRY_BY_CODE[countryCode] ?? PHONE_COUNTRY_BY_CODE[DEFAULT_PHONE_COUNTRY];
  const normalizedNational = normalizePhoneDigits(nationalNumber);
  return `${country.dialCode}${normalizedNational}`;
}

function getPhoneValidationError(countryCode: PhoneCountryCode, nationalNumber: string) {
  const country = PHONE_COUNTRY_BY_CODE[countryCode] ?? PHONE_COUNTRY_BY_CODE[DEFAULT_PHONE_COUNTRY];
  const normalizedNational = normalizePhoneDigits(nationalNumber);

  if (!normalizedNational) {
    return `Phone number is required for ${country.name}.`;
  }

  if (
    normalizedNational.length < country.minNationalDigits ||
    normalizedNational.length > country.maxNationalDigits
  ) {
    if (country.minNationalDigits === country.maxNationalDigits) {
      return `Enter a valid ${country.name} number with ${country.minNationalDigits} digits after ${country.dialCode}.`;
    }

    return `Enter a valid ${country.name} number with ${country.minNationalDigits}-${country.maxNationalDigits} digits after ${country.dialCode}.`;
  }

  return null;
}

interface OnboardingFormState {
  firstName: string;
  lastName: string;
  preferredName: string;
  phoneCountryCode: PhoneCountryCode;
  phoneNumber: string;
  facultyName: StudentFaculty | '';
  programName: StudentProgram | '';
  academicYear: AcademicYear | '';
  semester: Semester | '';
  profileImageUrl: string;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
}

function toFormState(profile: UserResponse['studentProfile']): OnboardingFormState {
  const parsedPhone = parsePhoneForForm(profile?.phoneNumber ?? '');

  return {
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    preferredName: profile?.preferredName ?? '',
    phoneCountryCode: parsedPhone.countryCode,
    phoneNumber: parsedPhone.nationalNumber,
    facultyName: profile?.facultyName ?? '',
    programName: profile?.programName ?? '',
    academicYear: profile?.academicYear ?? '',
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
  const [selectedImageFile, setSelectedImageFile] = React.useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null);
  const [submitStage, setSubmitStage] = React.useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

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
          window.location.assign(getUserHomePath(resolvedUser));
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

  function handleFacultyChange(facultyName: StudentFaculty | '') {
    setFormState((current) => ({
      ...current,
      facultyName,
      programName:
        facultyName && current.programName && programBelongsToFaculty(current.programName, facultyName)
          ? current.programName
          : '',
    }));
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      event.currentTarget.value = '';
      setAlert({
        variant: 'error',
        title: 'Unsupported image',
        message: 'Please choose a JPEG, PNG, or WebP image.',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      event.currentTarget.value = '';
      setAlert({
        variant: 'error',
        title: 'Image too large',
        message: 'Profile images must be 2 MB or smaller.',
      });
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setAlert(null);
  }

  function handleRemoveImage() {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
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

    if (!formState.firstName || !formState.lastName) {
      setAlert({
        variant: 'error',
        title: 'Missing required fields',
        message: 'Please complete all required fields before submitting onboarding.',
      });
      return;
    }

    const phoneValidationError = getPhoneValidationError(formState.phoneCountryCode, formState.phoneNumber);

    if (phoneValidationError) {
      setAlert({
        variant: 'error',
        title: 'Invalid phone number',
        message: phoneValidationError,
      });
      return;
    }

    const facultyName = formState.facultyName;
    const programName = formState.programName;
    const academicYear = formState.academicYear;
    const semester = formState.semester;

    if (!facultyName || !programName || !academicYear || !semester) {
      setAlert({
        variant: 'error',
        title: 'Academic details required',
        message: 'Faculty, program, academic year, and semester are required for student onboarding.',
      });
      return;
    }

    startSubmitTransition(async () => {
      let submitStep: 'image' | 'onboarding' = 'onboarding';

      try {
        let profileImageUrl = formState.profileImageUrl.trim() || undefined;

        if (selectedImageFile) {
          submitStep = 'image';
          setSubmitStage('Uploading profile image...');

          const imageUser = await uploadStudentProfileImage(session.access_token, selectedImageFile);
          const uploadedProfileImageUrl = imageUser.studentProfile?.profileImageUrl?.trim();

          if (!uploadedProfileImageUrl) {
            throw new Error('The profile image uploaded, but the server did not return an image URL.');
          }

          profileImageUrl = uploadedProfileImageUrl;
          setFormState((current) => ({
            ...current,
            profileImageUrl: uploadedProfileImageUrl,
          }));
          setSelectedImageFile(null);
          setImagePreviewUrl(null);
          if (imageInputRef.current) {
            imageInputRef.current.value = '';
          }
        }

        submitStep = 'onboarding';
        setSubmitStage('Completing onboarding...');
        const formattedPhoneNumber = formatPhoneForSubmit(formState.phoneCountryCode, formState.phoneNumber);
        const payload: StudentOnboardingRequest = {
          firstName: formState.firstName.trim(),
          lastName: formState.lastName.trim(),
          preferredName: formState.preferredName.trim() || undefined,
          phoneNumber: formattedPhoneNumber,
          facultyName,
          programName,
          academicYear,
          semester,
          profileImageUrl,
          emailNotificationsEnabled: formState.emailNotificationsEnabled,
          smsNotificationsEnabled: formState.smsNotificationsEnabled,
        };

        await completeStudentOnboarding(session.access_token, payload);
        const refreshedUser = await refreshMe();
        const redirectUser = refreshedUser ?? resolvedUser;

        // Use a full navigation so role/onboarding guards rehydrate from the latest backend state.
        if (redirectUser) {
          window.location.assign(getUserHomePath(redirectUser));
        }
      } catch (error) {
        setAlert({
          variant: 'error',
          title: submitStep === 'image' ? 'Image upload failed' : 'Onboarding failed',
          message: getErrorMessage(
            error,
            submitStep === 'image'
              ? 'We could not upload your profile image right now.'
              : 'We could not complete onboarding.',
          ),
        });
      } finally {
        setSubmitStage(null);
      }
    });
  }

  const programOptions = formState.facultyName ? programOptionsByFaculty[formState.facultyName] : [];
  const selectedPhoneCountry =
    PHONE_COUNTRY_BY_CODE[formState.phoneCountryCode] ?? PHONE_COUNTRY_BY_CODE[DEFAULT_PHONE_COUNTRY];
  const phoneDigitsHint =
    selectedPhoneCountry.minNationalDigits === selectedPhoneCountry.maxNationalDigits
      ? `${selectedPhoneCountry.minNationalDigits} digits`
      : `${selectedPhoneCountry.minNationalDigits}-${selectedPhoneCountry.maxNationalDigits} digits`;
  const heroImageUrl = '/onboarding-hero.jpg';

  return (
    <div className="onboarding-page">
      <div aria-hidden="true" className="onboarding-page-glow onboarding-page-glow-left" />
      <div aria-hidden="true" className="onboarding-page-glow onboarding-page-glow-right" />
      <style>{`
        .onboarding-page {
          min-height: 100dvh;
          position: relative;
          padding: clamp(6px, 1.1vw, 14px);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow-x: hidden;
          overflow-y: auto;
          background:
            radial-gradient(circle at 8% 10%, rgba(238,202,68,.14), transparent 30%),
            radial-gradient(circle at 92% 92%, rgba(70,66,55,.32), transparent 28%),
            linear-gradient(180deg, #121212 0%, #161514 100%);
        }

        .onboarding-page-glow {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          pointer-events: none;
        }

        .onboarding-page-glow-left {
          inset: 10% auto auto 6%;
          background: rgba(238,202,68,.1);
          filter: blur(88px);
        }

        .onboarding-page-glow-right {
          inset: auto 3% 8% auto;
          background: rgba(72,68,60,.34);
          filter: blur(96px);
        }

        .onboarding-layout {
          width: min(100%, 1180px);
          display: grid;
          grid-template-columns: minmax(300px, .95fr) minmax(460px, 1.05fr);
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(14,14,14,.74);
          backdrop-filter: blur(14px) saturate(1.2);
          -webkit-backdrop-filter: blur(14px) saturate(1.2);
          box-shadow: 0 18px 42px rgba(0,0,0,.46);
          height: clamp(560px, 74vh, 720px);
          max-height: min(720px, calc(100dvh - 26px));
          min-height: min(540px, calc(100dvh - 26px));
          position: relative;
          z-index: 1;
        }

        .onboarding-hero {
          position: relative;
          overflow: hidden;
          border-right: 1px solid rgba(255,255,255,.06);
          background: #0f0f10;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          filter: grayscale(.08) contrast(1.04);
        }

        .onboarding-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(9,9,9,.2) 0%, rgba(9,9,9,.62) 70%, rgba(9,9,9,.78) 100%);
          z-index: 1;
        }

        .onboarding-hero::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 80% 20%, rgba(238,202,68,.16), transparent 38%);
          z-index: 1;
        }

        .onboarding-hero-copy {
          position: absolute;
          left: 26px;
          right: 26px;
          bottom: 22px;
          z-index: 2;
          max-width: 360px;
          display: grid;
          gap: 8px;
        }

        .onboarding-hero-heading {
          margin: 0;
          font-family: var(--font-display);
          font-size: clamp(34px, 3.4vw, 48px);
          line-height: 1.03;
          font-weight: 800;
          color: #f2ca50;
          letter-spacing: -.02em;
        }

        .onboarding-hero-rule {
          width: 48px;
          height: 3px;
          border-radius: 999px;
          background: linear-gradient(90deg, #f2ca50, #d4af37);
        }

        .onboarding-hero-desc {
          margin: 0;
          color: rgba(221,214,200,.7);
          font-size: 13.5px;
          line-height: 1.55;
        }

        .onboarding-form-panel {
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: clamp(12px, 1.9vw, 24px);
          display: grid;
          gap: 10px;
          align-content: start;
          background:
            radial-gradient(circle at top right, rgba(238,202,68,.16), transparent 28%),
            linear-gradient(180deg, #0b0b0c 0%, #0f0f11 100%);
        }

        .onboarding-form-panel::-webkit-scrollbar {
          width: 7px;
        }

        .onboarding-form-panel::-webkit-scrollbar-track {
          background: transparent;
        }

        .onboarding-form-panel::-webkit-scrollbar-thumb {
          background: rgba(212,174,40,.33);
          border-radius: 999px;
        }

        .onboarding-form-content {
          max-width: 840px;
          width: 100%;
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }

        .onboarding-header {
          display: grid;
          gap: 8px;
        }

        .onboarding-kicker {
          margin: 0;
          font-family: var(--font-mono);
          font-size: 9px;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: #f2ca50;
        }

        .onboarding-title {
          margin: 0;
          font-family: var(--font-display);
          font-size: clamp(22px, 2.2vw, 30px);
          line-height: 1.06;
          letter-spacing: -.02em;
          color: #f4f2ec;
          font-weight: 800;
        }

        .onboarding-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .onboarding-form {
          display: grid;
          gap: 14px;
        }

        .onboarding-panel {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(25,25,27,.92);
          box-shadow: 0 10px 36px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.03);
        }

        .onboarding-profile-panel {
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .onboarding-profile-main {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .onboarding-profile-title {
          margin: 0;
          font-family: var(--font-display);
          color: #f4f2ec;
          font-size: 18px;
          font-weight: 700;
          line-height: 1.1;
        }

        .onboarding-profile-subtitle {
          margin: 6px 0 0;
          color: #8a8477;
          font-size: 13.5px;
        }

        .onboarding-profile-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .onboarding-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .onboarding-grid-full {
          grid-column: 1 / -1;
        }

        .onboarding-phone-stack {
          display: grid;
          gap: 7px;
        }

        .onboarding-phone-label {
          margin: 0;
          font-family: var(--font-mono);
          font-size: 9px;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: var(--text-label);
        }

        .onboarding-phone-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .onboarding-phone-country {
          height: 46px;
          min-width: 150px;
          border-radius: var(--radius-md);
          border: 1.5px solid var(--input-border);
          background: #0a0a0a;
          color: #ece7db;
          font-size: 14px;
          padding: 0 10px;
          outline: none;
          transition: border-color .18s, box-shadow .18s;
        }

        .onboarding-phone-country:focus {
          border-color: rgba(238,202,68,.65);
          box-shadow: 0 0 0 3px rgba(238,202,68,.16);
        }

        .onboarding-phone-country option {
          background: #0a0a0a;
          color: #ece7db;
        }

        .onboarding-phone-input {
          flex: 1;
          height: 46px;
          border-radius: var(--radius-md);
          border: 1.5px solid var(--input-border);
          background: #0a0a0a;
          color: #ece7db;
          padding: 0 14px;
          outline: none;
          transition: border-color .18s, box-shadow .18s;
        }

        .onboarding-phone-input::placeholder {
          color: #5f5b53;
        }

        .onboarding-phone-input:focus {
          border-color: rgba(238,202,68,.65);
          box-shadow: 0 0 0 3px rgba(238,202,68,.16);
        }

        .onboarding-phone-hint {
          margin: 0;
          color: #8a8477;
          font-size: 12px;
        }

        .onboarding-section {
          display: grid;
          gap: 10px;
        }

        .onboarding-section-title {
          margin: 0;
          padding-left: 12px;
          border-left: 4px solid #f2ca50;
          font-family: var(--font-display);
          font-size: clamp(20px, 2vw, 24px);
          color: #f4f2ec;
          font-weight: 700;
          letter-spacing: -.02em;
        }

        .onboarding-notice-panel {
          padding: 14px 16px;
          display: grid;
          gap: 2px;
        }

        .onboarding-notice-title {
          margin: 0;
          color: #f4f2ec;
          font-family: var(--font-display);
          font-size: clamp(20px, 2vw, 24px);
          line-height: 1.06;
          font-weight: 700;
          letter-spacing: -.02em;
        }

        .onboarding-notice-subtitle {
          margin: 0;
          color: #8a8477;
          font-size: 13.5px;
        }

        .onboarding-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .onboarding-toggle-row:last-child {
          border-bottom: none;
          padding-bottom: 2px;
        }

        .onboarding-toggle-copy {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .onboarding-toggle-copy p {
          margin: 0;
        }

        .onboarding-toggle-label {
          color: #f4f2ec;
          font-size: 14px;
          font-weight: 600;
        }

        .onboarding-toggle-hint {
          color: #8a8477;
          font-size: 13px;
          margin-top: 3px;
        }

        .onboarding-submit-row {
          display: grid;
          gap: 8px;
          margin-top: 4px;
        }

        .onboarding-submit-status {
          margin: 0;
          font-size: 13.5px;
          color: #a8a192;
        }

        @media (prefers-color-scheme: light) {
          .onboarding-page {
            background:
              radial-gradient(circle at 8% 10%, rgba(238,202,68,.18), transparent 32%),
              radial-gradient(circle at 92% 92%, rgba(171,167,156,.2), transparent 30%),
              linear-gradient(180deg, #f8f6f0 0%, #f3f1ea 100%);
          }

          .onboarding-page-glow-left {
            background: rgba(238,202,68,.14);
          }

          .onboarding-page-glow-right {
            background: rgba(126,123,114,.24);
          }

          .onboarding-layout {
            border: 1px solid rgba(20,18,12,.08);
            background: rgba(255,255,255,.86);
            box-shadow: 0 16px 38px rgba(20,18,12,.18);
          }

          .onboarding-hero {
            border-right: 1px solid rgba(20,18,12,.08);
            filter: grayscale(.02) contrast(1.01);
          }

          .onboarding-hero::before {
            background: linear-gradient(180deg, rgba(250,249,246,.22) 0%, rgba(250,249,246,.66) 70%, rgba(250,249,246,.84) 100%);
          }

          .onboarding-hero::after {
            background: radial-gradient(circle at 80% 20%, rgba(176,140,20,.16), transparent 40%);
          }

          .onboarding-hero-heading {
            color: var(--yellow-700);
          }

          .onboarding-hero-desc {
            color: var(--text-body);
          }

          .onboarding-form-panel {
            background:
              radial-gradient(circle at top right, rgba(238,202,68,.14), transparent 30%),
              linear-gradient(180deg, #f8f6f0 0%, #f3f1ea 100%);
          }

          .onboarding-form-panel::-webkit-scrollbar-thumb {
            background: rgba(176,140,20,.34);
          }

          .onboarding-kicker {
            color: var(--yellow-700);
          }

          .onboarding-title,
          .onboarding-profile-title,
          .onboarding-section-title,
          .onboarding-notice-title,
          .onboarding-toggle-label {
            color: var(--text-h);
          }

          .onboarding-profile-subtitle,
          .onboarding-notice-subtitle,
          .onboarding-toggle-hint,
          .onboarding-submit-status,
          .onboarding-phone-hint,
          .onboarding-hero-desc {
            color: var(--text-body);
          }

          .onboarding-panel {
            border: 1px solid var(--border);
            background: rgba(255,255,255,.9);
            box-shadow: 0 10px 30px rgba(20,18,12,.14);
          }

          .onboarding-phone-country,
          .onboarding-phone-input {
            background: var(--surface);
            border-color: var(--input-border);
            color: var(--input-text);
          }

          .onboarding-phone-country option {
            background: #ffffff;
            color: var(--input-text);
          }

          .onboarding-phone-input::placeholder {
            color: var(--input-ph);
          }

          .onboarding-toggle-row {
            border-bottom: 1px solid rgba(20,18,12,.08);
          }
        }

        @media (max-height: 850px) {
          .onboarding-layout {
            height: clamp(520px, 72vh, 640px);
            max-height: calc(100dvh - 16px);
            min-height: min(500px, calc(100dvh - 16px));
          }

          .onboarding-form-panel {
            padding: 10px 14px;
            gap: 8px;
          }

          .onboarding-form-content {
            gap: 10px;
          }

          .onboarding-hero-copy {
            left: 18px;
            right: 18px;
            bottom: 16px;
          }

          .onboarding-hero-desc {
            font-size: 13px;
            line-height: 1.45;
          }
        }

        @media (max-height: 720px) {
          .onboarding-layout {
            height: auto;
            min-height: 0;
            max-height: none;
          }

          .onboarding-form-panel {
            overflow-y: visible;
          }
        }

        @media (max-width: 1080px) {
          .onboarding-layout {
            grid-template-columns: 1fr;
            width: min(100%, 760px);
            min-height: unset;
            max-height: none;
            height: auto;
          }

          .onboarding-hero {
            display: none;
          }

          .onboarding-form-panel {
            overflow-y: visible;
            padding: 18px 16px;
            gap: 12px;
          }
        }

        @media (max-width: 800px) {
          .onboarding-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 680px) {
          .onboarding-form-panel {
            padding: 16px 14px;
          }

          .onboarding-title {
            font-size: 24px;
          }

          .onboarding-section-title {
            font-size: 21px;
          }

          .onboarding-notice-title {
            font-size: 21px;
          }
        }
      `}</style>

      <div className="onboarding-layout">
        <aside className="onboarding-hero" aria-hidden="true" style={{ backgroundImage: `url(${heroImageUrl})` }}>
          <div className="onboarding-hero-copy">
            <p className="onboarding-hero-heading">Profile Details</p>
            <div className="onboarding-hero-rule" />
            <p className="onboarding-hero-desc">
              Finalize your identity within the academic portal. These details tailor your workspace to your
              curriculum and update preferences.
            </p>
          </div>
        </aside>

        <section className="onboarding-form-panel">
          <div className="onboarding-form-content">
            <header className="onboarding-header">
              <p className="onboarding-kicker">Student Identification</p>
              <h1 className="onboarding-title">Complete Profile</h1>
              <div className="onboarding-meta">
                <Chip color="glass">{resolvedUser.email}</Chip>
              </div>
            </header>

            {alert && <Alert variant={alert.variant} title={alert.title}>{alert.message}</Alert>}

            {loadingState ? (
              <div className="onboarding-panel" style={{ padding: 22, display: 'grid', gap: 12 }}>
                <Skeleton variant="line" height={24} width="32%" />
                <Skeleton variant="rect" height={96} />
                <Skeleton variant="rect" height={164} />
                <Skeleton variant="rect" height={210} />
              </div>
            ) : (
              <form className="onboarding-form" onSubmit={handleSubmit}>
                <div className="onboarding-panel onboarding-profile-panel">
                  <div className="onboarding-profile-main">
                    <Avatar
                      size="lg"
                      src={(imagePreviewUrl ?? formState.profileImageUrl) || undefined}
                      initials={`${formState.firstName?.[0] ?? resolvedUser.email[0] ?? 'S'}${formState.lastName?.[0] ?? ''}`.toUpperCase()}
                    />
                    <div>
                      <p className="onboarding-profile-title">Profile Portrait</p>
                      <p className="onboarding-profile-subtitle">Recommended size 400x400px. JPG, PNG, or WebP.</p>
                    </div>
                  </div>
                  <div className="onboarding-profile-actions">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      aria-label="Choose profile image"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                    <Button
                      type="button"
                      variant="subtle"
                      size="sm"
                      iconLeft={<ImageUp size={14} />}
                      disabled={isSubmitting}
                      onClick={() => imageInputRef.current?.click()}
                    >
                      {selectedImageFile ? 'Replace Image' : 'Choose Image'}
                    </Button>
                    {(selectedImageFile || imagePreviewUrl) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        iconLeft={<X size={14} />}
                        disabled={isSubmitting}
                        onClick={handleRemoveImage}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                <div className="onboarding-grid">
                  <Input
                    label="First Name"
                    placeholder="e.g. Julian"
                    value={formState.firstName}
                    onChange={(event) => setField('firstName', event.target.value)}
                    required
                  />
                  <Input
                    label="Last Name"
                    placeholder="e.g. Ashford"
                    value={formState.lastName}
                    onChange={(event) => setField('lastName', event.target.value)}
                    required
                  />

                  <div className="onboarding-grid-full onboarding-phone-stack">
                    <p className="onboarding-phone-label">Phone Number</p>
                    <div className="onboarding-phone-row">
                      <select
                        className="onboarding-phone-country"
                        value={formState.phoneCountryCode}
                        onChange={(event) => setField('phoneCountryCode', event.target.value as PhoneCountryCode)}
                        aria-label="Phone country code"
                        disabled={isSubmitting}
                      >
                        {PHONE_COUNTRIES.map((country) => (
                          <option key={country.code} value={country.code}>
                            {`${country.flag} ${country.dialCode}`}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        className="onboarding-phone-input"
                        value={formState.phoneNumber}
                        onChange={(event) => setField('phoneNumber', event.target.value.replace(/\D/g, ''))}
                        placeholder="Enter phone number"
                        inputMode="numeric"
                        required
                      />
                    </div>
                    <p className="onboarding-phone-hint">
                      {`${selectedPhoneCountry.flag} ${selectedPhoneCountry.name}: ${phoneDigitsHint} after ${selectedPhoneCountry.dialCode}`}
                    </p>
                  </div>
                </div>

                <section className="onboarding-section">
                  <h2 className="onboarding-section-title">Academic Placement</h2>
                  <div className="onboarding-grid">
                    <Select
                      label="Faculty / School"
                      value={formState.facultyName}
                      onChange={(event) => handleFacultyChange(event.target.value as StudentFaculty | '')}
                      options={facultyOptions}
                      placeholder="Choose faculty"
                      required
                    />
                    <Select
                      label="Academic Program"
                      value={formState.programName}
                      onChange={(event) => setField('programName', event.target.value as StudentProgram | '')}
                      options={programOptions}
                      placeholder="Choose program"
                      disabled={!formState.facultyName}
                      required
                    />
                    <Select
                      label="Academic Year"
                      value={formState.academicYear}
                      onChange={(event) => setField('academicYear', event.target.value as AcademicYear | '')}
                      options={academicYearOptions}
                      placeholder="Choose year"
                      required
                    />
                    <Select
                      label="Semester"
                      value={formState.semester}
                      onChange={(event) => setField('semester', event.target.value as Semester | '')}
                      options={semesterOptions}
                      placeholder="Choose semester"
                      required
                    />
                  </div>
                </section>

                <section className="onboarding-panel onboarding-notice-panel">
                  <h2 className="onboarding-notice-title">Notifications</h2>
                  <p className="onboarding-notice-subtitle">Stay updated with academic deadlines and account alerts.</p>

                  <div className="onboarding-toggle-row">
                    <div className="onboarding-toggle-copy">
                      <Mail size={17} color="#f2ca50" />
                      <div>
                        <p className="onboarding-toggle-label">Email Notifications</p>
                        <p className="onboarding-toggle-hint">Official correspondence and records.</p>
                      </div>
                    </div>
                    <Toggle
                      ariaLabel="Email notifications"
                      label={undefined}
                      checked={formState.emailNotificationsEnabled}
                      onChange={(checked) => setField('emailNotificationsEnabled', checked)}
                    />
                  </div>

                  <div className="onboarding-toggle-row">
                    <div className="onboarding-toggle-copy">
                      <MessageSquare size={17} color="#f2ca50" />
                      <div>
                        <p className="onboarding-toggle-label">SMS Notifications</p>
                        <p className="onboarding-toggle-hint">Immediate security and urgent reminder alerts.</p>
                      </div>
                    </div>
                    <Toggle
                      ariaLabel="SMS notifications"
                      label={undefined}
                      checked={formState.smsNotificationsEnabled}
                      onChange={(checked) => setField('smsNotificationsEnabled', checked)}
                    />
                  </div>
                </section>

                <div className="onboarding-submit-row">
                  {submitStage && <p className="onboarding-submit-status">{submitStage}</p>}
                  <Button
                    type="submit"
                    variant="glass"
                    size="lg"
                    loading={isSubmitting}
                    fullWidth
                    style={{
                      height: 58,
                      fontSize: 13,
                      borderRadius: 14,
                      letterSpacing: '.08em',
                    }}
                  >
                    Complete Onboarding
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
