'use client';

import React from 'react';
import {
  CheckCircle2,
  Shield,
  User,
  ZoomIn,
  ImageUp,
  Crop,
  X,
} from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip, Dialog, Input, Select, Skeleton } from '@/components/ui';
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
  flag: string;
  name: string;
  dialCode: string;
  minNationalDigits: number;
  maxNationalDigits: number;
}

const DEFAULT_PHONE_COUNTRY: PhoneCountryCode = 'US';

const PHONE_COUNTRIES: PhoneCountryOption[] = [
  { code: 'US', flag: '🇺🇸', name: 'United States', dialCode: '+1', minNationalDigits: 10, maxNationalDigits: 10 },
  { code: 'LK', flag: '🇱🇰', name: 'Sri Lanka', dialCode: '+94', minNationalDigits: 9, maxNationalDigits: 9 },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', dialCode: '+44', minNationalDigits: 9, maxNationalDigits: 10 },
  { code: 'IN', flag: '🇮🇳', name: 'India', dialCode: '+91', minNationalDigits: 10, maxNationalDigits: 10 },
  { code: 'AU', flag: '🇦🇺', name: 'Australia', dialCode: '+61', minNationalDigits: 9, maxNationalDigits: 9 },
  { code: 'SG', flag: '🇸🇬', name: 'Singapore', dialCode: '+65', minNationalDigits: 8, maxNationalDigits: 8 },
  { code: 'MY', flag: '🇲🇾', name: 'Malaysia', dialCode: '+60', minNationalDigits: 9, maxNationalDigits: 10 },
  { code: 'AE', flag: '🇦🇪', name: 'United Arab Emirates', dialCode: '+971', minNationalDigits: 9, maxNationalDigits: 9 },
  { code: 'DE', flag: '🇩🇪', name: 'Germany', dialCode: '+49', minNationalDigits: 10, maxNationalDigits: 11 },
  { code: 'JP', flag: '🇯🇵', name: 'Japan', dialCode: '+81', minNationalDigits: 9, maxNationalDigits: 10 },
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

const PORTRAIT_CROP_VIEW_WIDTH = 320;
const PORTRAIT_CROP_VIEW_HEIGHT = 320;
const PORTRAIT_OUTPUT_WIDTH = 960;
const PORTRAIT_OUTPUT_HEIGHT = 960;
const MAX_PORTRAIT_ZOOM = 3;

interface CropEditorState {
  file: File;
  sourceUrl: string;
  width: number;
  height: number;
}

interface CropOffset {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function stripFileExtension(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'profile';
  }

  const extensionIndex = trimmed.lastIndexOf('.');

  if (extensionIndex <= 0) {
    return trimmed;
  }

  return trimmed.slice(0, extensionIndex);
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

function loadImageDimensions(sourceUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      reject(new Error('Unable to load the selected image.'));
    };
    image.src = sourceUrl;
  });
}

function loadImageElement(sourceUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to prepare the image for cropping.'));
    image.src = sourceUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error('Unable to generate the cropped portrait.'));
    }, mimeType, quality);
  });
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
}

interface OnboardingFieldErrors {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  facultyName?: string;
  programName?: string;
  academicYear?: string;
  semester?: string;
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
  const [fieldErrors, setFieldErrors] = React.useState<OnboardingFieldErrors>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = React.useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null);
  const [hasAppliedCrop, setHasAppliedCrop] = React.useState(false);
  const [submitStage, setSubmitStage] = React.useState<string | null>(null);
  const [cropEditorOpen, setCropEditorOpen] = React.useState(false);
  const [cropEditorState, setCropEditorState] = React.useState<CropEditorState | null>(null);
  const [cropZoom, setCropZoom] = React.useState(1);
  const [cropOffset, setCropOffset] = React.useState<CropOffset>({ x: 0, y: 0 });
  const [isCropDragging, setIsCropDragging] = React.useState(false);
  const [isApplyingCrop, setIsApplyingCrop] = React.useState(false);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const cropDragStartRef = React.useRef<{
    pointerId: number;
    originX: number;
    originY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  const cropMetrics = React.useMemo(() => {
    if (!cropEditorState) {
      return null;
    }

    const baseScale = Math.max(
      PORTRAIT_CROP_VIEW_WIDTH / cropEditorState.width,
      PORTRAIT_CROP_VIEW_HEIGHT / cropEditorState.height,
    );
    const renderScale = baseScale * cropZoom;
    const renderedWidth = cropEditorState.width * renderScale;
    const renderedHeight = cropEditorState.height * renderScale;

    return {
      renderScale,
      renderedWidth,
      renderedHeight,
      maxOffsetX: Math.max(0, (renderedWidth - PORTRAIT_CROP_VIEW_WIDTH) / 2),
      maxOffsetY: Math.max(0, (renderedHeight - PORTRAIT_CROP_VIEW_HEIGHT) / 2),
    };
  }, [cropEditorState, cropZoom]);
  const cropOffsetLimitX = cropMetrics?.maxOffsetX ?? 0;
  const cropOffsetLimitY = cropMetrics?.maxOffsetY ?? 0;

  React.useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  React.useEffect(() => {
    return () => {
      if (cropEditorState?.sourceUrl) {
        URL.revokeObjectURL(cropEditorState.sourceUrl);
      }
    };
  }, [cropEditorState]);

  React.useEffect(() => {
    setCropOffset((current) => ({
      x: clamp(current.x, -cropOffsetLimitX, cropOffsetLimitX),
      y: clamp(current.y, -cropOffsetLimitY, cropOffsetLimitY),
    }));
  }, [cropOffsetLimitX, cropOffsetLimitY]);

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

    if (field in fieldErrors) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[field as keyof OnboardingFieldErrors];
        return next;
      });
    }
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

    setFieldErrors((current) => {
      const next = { ...current };
      delete next.facultyName;
      delete next.programName;
      return next;
    });
  }

  function closeCropEditor() {
    setCropEditorOpen(false);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setCropEditorState(null);
    setIsApplyingCrop(false);
    setIsCropDragging(false);
    cropDragStartRef.current = null;
  }

  async function openCropEditor(file: File) {
    const sourceUrl = URL.createObjectURL(file);

    try {
      const { width, height } = await loadImageDimensions(sourceUrl);

      if (width < 64 || height < 64) {
        throw new Error('Please choose an image that is at least 64 x 64 pixels.');
      }

      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setCropEditorState({ file, sourceUrl, width, height });
      setCropEditorOpen(true);
      setAlert(null);
    } catch (error) {
      URL.revokeObjectURL(sourceUrl);
      setAlert({
        variant: 'error',
        title: 'Image unavailable',
        message: getErrorMessage(error, 'We could not read that image. Please choose another file.'),
      });
    }
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;

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

    event.currentTarget.value = '';

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setHasAppliedCrop(false);
    setAlert(null);
  }

  function handleOpenCropEditor() {
    if (!selectedImageFile || isSubmitting) {
      return;
    }

    void openCropEditor(selectedImageFile);
  }

  function handleCropPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!cropMetrics) {
      return;
    }

    cropDragStartRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      startOffsetX: cropOffset.x,
      startOffsetY: cropOffset.y,
    };
    setIsCropDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCropPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!cropMetrics || !cropDragStartRef.current) {
      return;
    }

    const dragState = cropDragStartRef.current;

    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.originX;
    const deltaY = event.clientY - dragState.originY;

    setCropOffset({
      x: clamp(dragState.startOffsetX + deltaX, -cropMetrics.maxOffsetX, cropMetrics.maxOffsetX),
      y: clamp(dragState.startOffsetY + deltaY, -cropMetrics.maxOffsetY, cropMetrics.maxOffsetY),
    });
  }

  function handleCropPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (!cropDragStartRef.current || cropDragStartRef.current.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsCropDragging(false);
    cropDragStartRef.current = null;
  }

  async function handleApplyCrop() {
    if (!cropEditorState || !cropMetrics) {
      return;
    }

    setIsApplyingCrop(true);

    try {
      const sourceImage = await loadImageElement(cropEditorState.sourceUrl);
      const canvas = document.createElement('canvas');
      canvas.width = PORTRAIT_OUTPUT_WIDTH;
      canvas.height = PORTRAIT_OUTPUT_HEIGHT;

      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Unable to initialize the image cropper canvas.');
      }

      const imageLeft = PORTRAIT_CROP_VIEW_WIDTH / 2 - cropMetrics.renderedWidth / 2 + cropOffset.x;
      const imageTop = PORTRAIT_CROP_VIEW_HEIGHT / 2 - cropMetrics.renderedHeight / 2 + cropOffset.y;
      const sourceX = clamp((0 - imageLeft) / cropMetrics.renderScale, 0, sourceImage.naturalWidth);
      const sourceY = clamp((0 - imageTop) / cropMetrics.renderScale, 0, sourceImage.naturalHeight);
      const sourceWidth = clamp(
        PORTRAIT_CROP_VIEW_WIDTH / cropMetrics.renderScale,
        1,
        sourceImage.naturalWidth - sourceX,
      );
      const sourceHeight = clamp(
        PORTRAIT_CROP_VIEW_HEIGHT / cropMetrics.renderScale,
        1,
        sourceImage.naturalHeight - sourceY,
      );

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        sourceImage,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        PORTRAIT_OUTPUT_WIDTH,
        PORTRAIT_OUTPUT_HEIGHT,
      );

      const outputMimeType =
        cropEditorState.file.type === 'image/png' || cropEditorState.file.type === 'image/webp'
          ? cropEditorState.file.type
          : 'image/jpeg';
      const blob = await canvasToBlob(canvas, outputMimeType, 0.92);
      const croppedFile = new File(
        [blob],
        `${stripFileExtension(cropEditorState.file.name)}-portrait.${extensionForMimeType(outputMimeType)}`,
        {
          type: outputMimeType,
          lastModified: Date.now(),
        },
      );

      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }

      setSelectedImageFile(croppedFile);
      setImagePreviewUrl(URL.createObjectURL(croppedFile));
      setHasAppliedCrop(true);
      setAlert(null);
      closeCropEditor();
    } catch (error) {
      setAlert({
        variant: 'error',
        title: 'Crop failed',
        message: getErrorMessage(error, 'We could not crop this image right now. Please try again.'),
      });
    } finally {
      setIsApplyingCrop(false);
    }
  }

  function handleRemoveImage() {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setHasAppliedCrop(false);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }

  function validateForm() {
    const nextErrors: OnboardingFieldErrors = {};

    if (!formState.firstName.trim()) {
      nextErrors.firstName = 'First name is required';
    }

    if (!formState.lastName.trim()) {
      nextErrors.lastName = 'Last name is required';
    }

    const selectedCountry = PHONE_COUNTRY_BY_CODE[formState.phoneCountryCode] ?? PHONE_COUNTRY_BY_CODE[DEFAULT_PHONE_COUNTRY];
    const phoneDigits = normalizePhoneDigits(formState.phoneNumber);

    if (
      phoneDigits.length < selectedCountry.minNationalDigits ||
      phoneDigits.length > selectedCountry.maxNationalDigits
    ) {
      nextErrors.phoneNumber = `Use ${selectedCountry.minNationalDigits}-${selectedCountry.maxNationalDigits} digits`;
    }

    const facultyName = formState.facultyName;
    const programName = formState.programName;
    const academicYear = formState.academicYear;
    const semester = formState.semester;

    if (!facultyName) {
      nextErrors.facultyName = 'Faculty is required';
    }

    if (!programName) {
      nextErrors.programName = 'Program is required';
    }

    if (!academicYear) {
      nextErrors.academicYear = 'Academic year is required';
    }

    if (!semester) {
      nextErrors.semester = 'Semester is required';
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return null;
    }

    return {
      facultyName: facultyName as StudentFaculty,
      programName: programName as StudentProgram,
      academicYear: academicYear as AcademicYear,
      semester: semester as Semester,
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!session?.access_token) {
      setSubmitError('Please sign in again before completing onboarding.');
      return;
    }

    const academicInfo = validateForm();

    if (!academicInfo) {
      return;
    }

    const { facultyName, programName, academicYear, semester } = academicInfo;

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
          setHasAppliedCrop(false);
          if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
          }
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
        };

        await completeStudentOnboarding(session.access_token, payload);
        const refreshedUser = await refreshMe();
        const redirectUser = refreshedUser ?? resolvedUser;

        // Use a full navigation so role/onboarding guards rehydrate from the latest backend state.
        if (redirectUser) {
          window.location.assign(getUserHomePath(redirectUser));
        }
      } catch (error) {
        setSubmitError(
          getErrorMessage(
            error,
            submitStep === 'image'
              ? 'We could not upload your profile image right now.'
              : 'We could not complete onboarding.',
          ),
        );
      } finally {
        setSubmitStage(null);
      }
    });
  }

  const programOptions = formState.facultyName ? programOptionsByFaculty[formState.facultyName] : [];
  const phoneCountryOptions = PHONE_COUNTRIES.map((country) => ({
    value: country.code,
    label: `${country.flag} ${country.dialCode}`,
  }));
  const selectedPhoneCountry = PHONE_COUNTRY_BY_CODE[formState.phoneCountryCode] ?? PHONE_COUNTRY_BY_CODE[DEFAULT_PHONE_COUNTRY];
  const portraitPreviewUrl = imagePreviewUrl ?? formState.profileImageUrl;
  const hasStagedPortrait = Boolean(selectedImageFile || imagePreviewUrl);
  const portraitStatus: { color: 'green' | 'blue' | 'neutral'; label: string } = selectedImageFile
    ? hasAppliedCrop
      ? { color: 'green', label: 'Cropped Ready' }
      : { color: 'blue', label: 'Selected' }
    : portraitPreviewUrl
      ? { color: 'blue', label: 'Portrait Added' }
      : { color: 'neutral', label: 'Portrait Optional' };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <style>{`
        .onboarding-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(28px, 5vh, 56px) 24px 48px;
        }
        .onboarding-form-layout {
          display: grid;
          gap: 24px;
        }
        .onboarding-form-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.28fr) minmax(0, 0.92fr);
          gap: 24px;
          align-items: start;
        }
        .onboarding-column {
          display: grid;
          gap: 24px;
          align-content: start;
        }
        .onboarding-column-secondary {
          grid-template-rows: auto 1fr;
        }
        .onboarding-form-card {
          display: flex;
          flex-direction: column;
        }
        .onboarding-form-card-fill {
          height: 100%;
        }
        .onboarding-form-card-fill .onboarding-section {
          height: 100%;
          align-content: start;
        }
        .onboarding-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .onboarding-section {
          display: grid;
          gap: 15px;
        }
        .onboarding-section-title {
          margin: 0;
          font-family: var(--font-display);
          font-size: 22px;
          line-height: 1.12;
          font-weight: 800;
          color: var(--text-h);
        }
        .onboarding-section-copy {
          margin: 6px 0 0;
          color: var(--text-muted);
          font-size: 13.5px;
          line-height: 1.55;
        }
        .onboarding-field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .onboarding-field-full {
          grid-column: 1 / -1;
        }
        .onboarding-phone-grid {
          display: grid;
          grid-template-columns: minmax(112px, .28fr) minmax(0, .72fr);
          gap: 10px;
        }
        .onboarding-portrait-stage {
          display: grid;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: linear-gradient(160deg, rgba(238,202,68,.12), rgba(255,255,255,.02));
        }
        .onboarding-portrait-frame {
          width: min(100%, 220px);
          aspect-ratio: 1 / 1;
          justify-self: center;
          border-radius: 50%;
          overflow: hidden;
          position: relative;
          border: 2px solid rgba(238,202,68,.5);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), 0 14px 28px rgba(0,0,0,.18);
          background: radial-gradient(circle at 20% 20%, rgba(238,202,68,.22), rgba(22,22,20,.9));
        }
        .onboarding-portrait-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .onboarding-portrait-fallback {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          gap: 0;
          color: rgba(255,255,255,.92);
          text-align: center;
          padding: 0;
          position: relative;
          overflow: hidden;
          background: radial-gradient(circle at 32% 28%, rgba(238,202,68,.28), rgba(238,202,68,.1) 58%, rgba(15,15,14,.94));
        }
        .onboarding-portrait-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: radial-gradient(circle at 32% 28%, rgba(238,202,68,.35), rgba(238,202,68,.14) 56%, rgba(15,15,14,.72));
          border: 3px solid rgba(238,202,68,.65);
          color: rgba(255,255,255,.92);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.1);
        }
        .onboarding-verification-card {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: linear-gradient(150deg, rgba(238,202,68,.1), rgba(255,255,255,.02));
        }
        .onboarding-verification-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(238,202,68,.16);
          border: 1px solid rgba(238,202,68,.3);
          color: rgba(238,202,68,.95);
        }
        .onboarding-verification-title {
          margin: 0;
          font-family: var(--font-display);
          font-size: 18px;
          line-height: 1.1;
          font-weight: 800;
          color: var(--text-h);
        }
        .onboarding-verification-copy {
          margin: 4px 0 0;
          color: var(--text-muted);
          font-size: 12.5px;
          line-height: 1.35;
        }
        .onboarding-profile-actions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .onboarding-profile-caption {
          margin: 0;
          color: var(--text-muted);
          font-size: 12.5px;
          line-height: 1.45;
        }
        .onboarding-notification-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--surface-2);
        }
        .onboarding-notification-copy {
          min-width: 190px;
        }
        .onboarding-notification-title {
          margin: 0;
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 800;
          color: var(--text-h);
        }
        .onboarding-notification-caption {
          margin: 3px 0 0;
          color: var(--text-muted);
          font-size: 12.5px;
          line-height: 1.35;
        }
        .onboarding-notification-options {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
        .onboarding-toggle-pill {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-width: 116px;
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--surface);
        }
        .onboarding-toggle-copy {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--text-h);
          font-size: 13px;
          font-weight: 700;
        }
        .onboarding-academic-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .onboarding-submit-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: stretch;
          padding-top: 2px;
        }
        .onboarding-primary-action {
          width: 100%;
        }
        .onboarding-status {
          margin: 0;
          color: var(--text-muted);
          font-size: 13px;
        }
        .onboarding-crop-body {
          display: grid;
          gap: 16px;
          padding: 20px 24px 24px;
        }
        .onboarding-crop-viewport {
          width: min(100%, ${PORTRAIT_CROP_VIEW_WIDTH}px);
          height: ${PORTRAIT_CROP_VIEW_HEIGHT}px;
          justify-self: center;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(238,202,68,.5);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.05), 0 12px 30px rgba(0,0,0,.24);
          position: relative;
          background: radial-gradient(circle at 20% 15%, rgba(238,202,68,.2), rgba(22,22,20,.95));
          cursor: grab;
          touch-action: none;
        }
        .onboarding-crop-viewport.dragging {
          cursor: grabbing;
        }
        .onboarding-crop-image {
          position: absolute;
          user-select: none;
          pointer-events: none;
          -webkit-user-drag: none;
          max-width: none;
          max-height: none;
        }
        .onboarding-crop-guide {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border: 2px solid rgba(255,255,255,.72);
          border-radius: 18px;
          box-shadow: inset 0 0 0 999px rgba(0,0,0,.24);
        }
        .onboarding-crop-control {
          display: grid;
          gap: 8px;
        }
        .onboarding-crop-control-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: var(--text-h);
          font-size: 12px;
          font-weight: 700;
        }
        .onboarding-crop-range {
          width: 100%;
          accent-color: var(--yellow-400);
        }
        .onboarding-crop-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 1120px) {
          .onboarding-form-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 760px) {
          .onboarding-main {
            align-items: flex-start;
            padding: 28px 16px 36px;
          }
          .onboarding-form-grid,
          .onboarding-column {
            gap: 20px;
          }
          .onboarding-field-grid,
          .onboarding-profile-actions,
          .onboarding-phone-grid,
          .onboarding-academic-grid,
          .onboarding-crop-actions {
            grid-template-columns: 1fr;
          }
          .onboarding-notification-strip,
          .onboarding-notification-options,
          .onboarding-toggle-pill {
            align-items: stretch;
            width: 100%;
          }
          .onboarding-submit-section {
            width: 100%;
          }
          .onboarding-crop-body {
            padding: 16px 16px 18px;
          }
        }
        @media (max-height: 760px) and (min-width: 761px) {
          .onboarding-main {
            align-items: flex-start;
            padding: 26px 24px 32px;
          }
          .onboarding-form-layout {
            gap: 12px;
          }
          .onboarding-section {
            gap: 12px;
          }
          .onboarding-form-grid,
          .onboarding-column {
            gap: 16px;
          }
          .onboarding-section-copy,
          .onboarding-notification-caption {
            display: none;
          }
          .onboarding-portrait-stage,
          .onboarding-notification-strip {
            padding: 10px 12px;
          }
          .onboarding-field-grid,
          .onboarding-academic-grid {
            gap: 10px;
          }
        }
      `}</style>
      <main className="onboarding-main">
        <section
          aria-label="Student onboarding"
          className="w-full"
          style={{ maxWidth: 1100, margin: '0 auto' }}
        >
          <div style={{ marginBottom: 40 }}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: 0,
                color: 'var(--text-h)',
                margin: '0 0 8px',
                lineHeight: 1.15,
              }}
            >
              Complete Profile
            </h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
              Finish student onboarding to unlock your Smart Campus workspace
            </p>
          </div>

          {alert && alert.variant !== 'error' && (
            <div style={{ marginBottom: 20 }}>
              <Alert variant={alert.variant} title={alert.title}>
                {alert.message}
              </Alert>
            </div>
          )}

          {loadingState ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              <Card>
                <div style={{ display: 'grid', gap: 14 }}>
                  <Skeleton variant="line" height={18} width="46%" />
                  <Skeleton variant="rect" height={86} />
                  <Skeleton variant="rect" height={190} />
                  <Skeleton variant="line" height={48} width="40%" />
                </div>
              </Card>
              <Card>
                <div style={{ display: 'grid', gap: 14 }}>
                  <Skeleton variant="line" height={18} width="46%" />
                  <Skeleton variant="rect" height={48} />
                  <Skeleton variant="rect" height={48} />
                  <Skeleton variant="rect" height={48} />
                  <Skeleton variant="rect" height={48} />
                </div>
              </Card>
            </div>
          ) : (
            <form className="onboarding-form-layout" onSubmit={handleSubmit} noValidate>
              <div className="onboarding-form-grid">
                <div className="onboarding-column">
                  <Card hoverable className="onboarding-form-card">
                    <section className="onboarding-section" aria-labelledby="personal-info-title">
                      <div className="onboarding-card-header">
                        <h2 id="personal-info-title" className="onboarding-section-title">Personal Information</h2>
                        <Chip color="glass">{resolvedUser.email}</Chip>
                      </div>

                      <div className="onboarding-field-grid">
                        <Input
                          label="First Name"
                          placeholder="e.g. Julian"
                          value={formState.firstName}
                          onChange={(event) => setField('firstName', event.target.value)}
                          error={fieldErrors.firstName}
                          disabled={isSubmitting}
                          required
                        />
                        <Input
                          label="Last Name"
                          placeholder="e.g. Ashford"
                          value={formState.lastName}
                          onChange={(event) => setField('lastName', event.target.value)}
                          error={fieldErrors.lastName}
                          disabled={isSubmitting}
                          required
                        />
                        <div className="onboarding-field-full">
                          <div className="onboarding-phone-grid">
                            <Select
                              label="Country"
                              value={formState.phoneCountryCode}
                              onChange={(event) => setField('phoneCountryCode', event.target.value as PhoneCountryCode)}
                              options={phoneCountryOptions}
                              error={fieldErrors.phoneNumber}
                              disabled={isSubmitting}
                              required
                            />
                            <Input
                              label={`Phone Number (${selectedPhoneCountry.dialCode})`}
                              placeholder={`Use ${selectedPhoneCountry.minNationalDigits}-${selectedPhoneCountry.maxNationalDigits} digits`}
                              inputMode="numeric"
                              autoComplete="tel-national"
                              value={formState.phoneNumber}
                              onChange={(event) => setField('phoneNumber', normalizePhoneDigits(event.target.value))}
                              error={fieldErrors.phoneNumber}
                              disabled={isSubmitting}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </section>
                  </Card>

                  <Card hoverable className="onboarding-form-card">
                    <section className="onboarding-section" aria-labelledby="academic-info-title">
                      <div>
                        <h2 id="academic-info-title" className="onboarding-section-title">Academic Information</h2>
                      </div>

                      <div className="onboarding-academic-grid">
                        <Select
                          label="Faculty / School"
                          value={formState.facultyName}
                          onChange={(event) => handleFacultyChange(event.target.value as StudentFaculty | '')}
                          options={facultyOptions}
                          placeholder="Choose faculty"
                          error={fieldErrors.facultyName}
                          disabled={isSubmitting}
                          required
                        />
                        <Select
                          label="Academic Program"
                          value={formState.programName}
                          onChange={(event) => setField('programName', event.target.value as StudentProgram | '')}
                          options={programOptions}
                          placeholder="Choose program"
                          error={fieldErrors.programName}
                          disabled={!formState.facultyName || isSubmitting}
                          required
                        />
                        <Select
                          label="Academic Year"
                          value={formState.academicYear}
                          onChange={(event) => setField('academicYear', event.target.value as AcademicYear | '')}
                          options={academicYearOptions}
                          placeholder="Choose year"
                          error={fieldErrors.academicYear}
                          disabled={isSubmitting}
                          required
                        />
                        <Select
                          label="Semester"
                          value={formState.semester}
                          onChange={(event) => setField('semester', event.target.value as Semester | '')}
                          options={semesterOptions}
                          placeholder="Choose semester"
                          error={fieldErrors.semester}
                          disabled={isSubmitting}
                          required
                        />
                      </div>

                      <div className="onboarding-submit-section">
                        {submitError && <p className="onboarding-status" style={{ color: 'var(--red-500)' }}>{submitError}</p>}
                        {submitStage && <p className="onboarding-status">{submitStage}</p>}
                        <Button
                          type="submit"
                          variant="primary"
                          size="lg"
                          loading={isSubmitting}
                          iconLeft={<CheckCircle2 size={16} />}
                          className="onboarding-primary-action"
                        >
                          {isSubmitting ? 'Completing Onboarding...' : 'Complete Onboarding'}
                        </Button>
                      </div>
                    </section>
                  </Card>
                </div>

                <div className="onboarding-column onboarding-column-secondary">
                  <Card hoverable className="onboarding-form-card">
                    <section className="onboarding-section" aria-labelledby="portrait-title">
                      <div className="onboarding-card-header">
                        <h2 id="portrait-title" className="onboarding-section-title">Profile Portrait</h2>
                        <Chip color={portraitStatus.color}>{portraitStatus.label}</Chip>
                      </div>

                      <div className="onboarding-portrait-stage">
                        <div className="onboarding-portrait-frame">
                          {portraitPreviewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={portraitPreviewUrl}
                              alt="Profile portrait preview"
                              className="onboarding-portrait-image"
                            />
                          ) : (
                            <div className="onboarding-portrait-fallback">
                              <span className="onboarding-portrait-placeholder" aria-hidden="true">
                                <User size={86} strokeWidth={1.7} />
                              </span>
                            </div>
                          )}
                        </div>

                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                          aria-label="Choose profile image"
                          onChange={handleImageChange}
                          style={{ display: 'none' }}
                        />

                        <div className="onboarding-profile-actions">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            iconLeft={<ImageUp size={14} />}
                            disabled={isSubmitting}
                            onClick={() => imageInputRef.current?.click()}
                          >
                            {selectedImageFile ? 'Replace Image' : 'Upload Image'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            iconLeft={<Crop size={14} />}
                            disabled={isSubmitting || !selectedImageFile}
                            onClick={handleOpenCropEditor}
                          >
                            Crop Image
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            iconLeft={<X size={14} />}
                            disabled={isSubmitting || !hasStagedPortrait}
                            onClick={handleRemoveImage}
                          >
                            Remove Staged
                          </Button>
                        </div>

                        <p className="onboarding-profile-caption">JPG, PNG, or WebP. Maximum file size: 2 MB.</p>
                      </div>
                    </section>
                  </Card>

                  <Card hoverable className="onboarding-form-card onboarding-form-card-fill">
                    <section className="onboarding-section" aria-labelledby="portrait-tips-title">
                      <div className="onboarding-verification-card" id="portrait-tips-title">
                        <span className="onboarding-verification-icon" aria-hidden="true">
                          <Shield size={24} strokeWidth={2} />
                        </span>
                        <div>
                          <h2 className="onboarding-verification-title">Student ID Verification</h2>
                          <p className="onboarding-verification-copy">
                            Your profile photo will be used for digital student IDs and verification on campus.
                          </p>
                        </div>
                      </div>
                    </section>
                  </Card>
                </div>
              </div>
            </form>
          )}
        </section>
      </main>

      <Dialog
        open={cropEditorOpen}
        onClose={() => {
          if (!isApplyingCrop) {
            closeCropEditor();
          }
        }}
        closeOnBackdropClick={!isApplyingCrop}
        title="Adjust Portrait"
        size="md"
      >
        <div className="onboarding-crop-body">
          <p className="onboarding-section-copy" style={{ marginTop: 0 }}>
            Drag the photo to reposition it and use zoom to fit your portrait.
          </p>
          <div
            className={`onboarding-crop-viewport${isCropDragging ? ' dragging' : ''}`}
            onPointerDown={handleCropPointerDown}
            onPointerMove={handleCropPointerMove}
            onPointerUp={handleCropPointerEnd}
            onPointerCancel={handleCropPointerEnd}
          >
            {cropEditorState && cropMetrics && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cropEditorState.sourceUrl}
                alt="Portrait crop preview"
                className="onboarding-crop-image"
                draggable={false}
                style={{
                  width: cropMetrics.renderedWidth,
                  height: cropMetrics.renderedHeight,
                  left: PORTRAIT_CROP_VIEW_WIDTH / 2 - cropMetrics.renderedWidth / 2 + cropOffset.x,
                  top: PORTRAIT_CROP_VIEW_HEIGHT / 2 - cropMetrics.renderedHeight / 2 + cropOffset.y,
                }}
              />
            )}
            <div className="onboarding-crop-guide" />
          </div>

          <div className="onboarding-crop-control">
            <div className="onboarding-crop-control-head">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ZoomIn size={14} />
                Zoom
              </span>
              <span>{cropZoom.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={MAX_PORTRAIT_ZOOM}
              step={0.01}
              value={cropZoom}
              disabled={!cropMetrics}
              onChange={(event) => setCropZoom(Number(event.target.value))}
              className="onboarding-crop-range"
            />
          </div>

          <div className="onboarding-crop-actions">
            <Button type="button" variant="ghost" size="sm" disabled={isApplyingCrop} onClick={closeCropEditor}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" loading={isApplyingCrop} onClick={handleApplyCrop}>
              Apply Portrait
            </Button>
          </div>
        </div>
      </Dialog>

      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          height: 6,
          background: 'var(--yellow-400)',
          zIndex: 10,
        }}
      />
    </div>
  );
}
