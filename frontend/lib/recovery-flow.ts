export interface RecoveryFlowState {
  expectedEmail: string;
  updatedAt: number;
}

const RECOVERY_FLOW_STORAGE_KEY = 'smart-campus.recovery-flow';

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? null;
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function resolveRecoveryExpectedEmail(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const normalizedEmail = normalizeEmail(candidate);
    if (normalizedEmail) {
      return normalizedEmail;
    }
  }

  return null;
}

export function readRecoveryFlowState(): RecoveryFlowState | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(RECOVERY_FLOW_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<RecoveryFlowState>;
    const expectedEmail = normalizeEmail(parsed.expectedEmail);
    const updatedAt = typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
      ? parsed.updatedAt
      : Date.now();

    if (!expectedEmail) {
      return null;
    }

    return {
      expectedEmail,
      updatedAt,
    };
  } catch {
    return null;
  }
}

export function primeRecoveryFlowState(expectedEmail: string | null | undefined) {
  const normalizedEmail = normalizeEmail(expectedEmail);
  if (!canUseSessionStorage() || !normalizedEmail) {
    return null;
  }

  const nextState: RecoveryFlowState = {
    expectedEmail: normalizedEmail,
    updatedAt: Date.now(),
  };

  window.sessionStorage.setItem(RECOVERY_FLOW_STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
}

export function clearRecoveryFlowState() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(RECOVERY_FLOW_STORAGE_KEY);
}

export function isRecoveryExpectedEmailMatch(
  expectedEmail: string | null | undefined,
  email: string | null | undefined,
) {
  const normalizedExpectedEmail = normalizeEmail(expectedEmail);
  const normalizedEmail = normalizeEmail(email);
  return !!normalizedExpectedEmail && normalizedExpectedEmail === normalizedEmail;
}
