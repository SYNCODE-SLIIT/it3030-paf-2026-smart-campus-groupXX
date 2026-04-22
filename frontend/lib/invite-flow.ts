export interface InviteFlowState {
  expectedEmail: string;
  wrongAccountAttempts: number;
  updatedAt: number;
}

export interface PreservedInviteSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  email: string | null;
  updatedAt: number;
}

export const MAX_INVITE_WRONG_ACCOUNT_ATTEMPTS = 3;

const INVITE_FLOW_STORAGE_KEY = 'smart-campus.invite-flow';
const INVITE_SESSION_STORAGE_KEY = 'smart-campus.invite-session';

interface InviteSessionCandidate {
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  user?: {
    email?: string | null;
  } | null;
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? null;
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function resolveInviteExpectedEmail(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const normalizedEmail = normalizeEmail(candidate);
    if (normalizedEmail) {
      return normalizedEmail;
    }
  }

  return null;
}

export function readInviteFlowState(): InviteFlowState | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(INVITE_FLOW_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<InviteFlowState>;
    const expectedEmail = normalizeEmail(parsed.expectedEmail);
    const wrongAccountAttempts =
      typeof parsed.wrongAccountAttempts === 'number' && Number.isFinite(parsed.wrongAccountAttempts)
        ? Math.max(0, Math.floor(parsed.wrongAccountAttempts))
        : 0;
    const updatedAt = typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
      ? parsed.updatedAt
      : Date.now();

    if (!expectedEmail) {
      return null;
    }

    return {
      expectedEmail,
      wrongAccountAttempts,
      updatedAt,
    };
  } catch {
    return null;
  }
}

export function primeInviteFlowState(
  expectedEmail: string | null | undefined,
  options?: { resetWrongAccountAttempts?: boolean },
) {
  const normalizedEmail = normalizeEmail(expectedEmail);
  if (!canUseSessionStorage() || !normalizedEmail) {
    return null;
  }

  const currentState = readInviteFlowState();
  if (currentState?.expectedEmail === normalizedEmail && !options?.resetWrongAccountAttempts) {
    return currentState;
  }

  const nextState: InviteFlowState = {
    expectedEmail: normalizedEmail,
    wrongAccountAttempts: options?.resetWrongAccountAttempts ? 0 : currentState?.wrongAccountAttempts ?? 0,
    updatedAt: Date.now(),
  };

  window.sessionStorage.setItem(INVITE_FLOW_STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
}

export function clearInviteFlowState() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(INVITE_FLOW_STORAGE_KEY);
}

export function preserveInviteSession(session: InviteSessionCandidate | null | undefined) {
  if (!canUseSessionStorage() || !session?.access_token || !session.refresh_token) {
    return null;
  }

  const preservedSession: PreservedInviteSession = {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: typeof session.expires_at === 'number' ? session.expires_at : null,
    email: normalizeEmail(session.user?.email),
    updatedAt: Date.now(),
  };

  window.sessionStorage.setItem(INVITE_SESSION_STORAGE_KEY, JSON.stringify(preservedSession));
  return preservedSession;
}

export function readPreservedInviteSession(): PreservedInviteSession | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(INVITE_SESSION_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<PreservedInviteSession>;
    if (!parsed.accessToken || !parsed.refreshToken) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : null,
      email: normalizeEmail(parsed.email),
      updatedAt: typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
        ? parsed.updatedAt
        : Date.now(),
    };
  } catch {
    return null;
  }
}

export function clearPreservedInviteSession() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(INVITE_SESSION_STORAGE_KEY);
}

export function isInviteFlowEmailMatch(expectedState: InviteFlowState | null, email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);
  return !!expectedState?.expectedEmail && expectedState.expectedEmail === normalizedEmail;
}

export function isInviteExpectedEmailMatch(expectedEmail: string | null | undefined, email: string | null | undefined) {
  const normalizedExpectedEmail = normalizeEmail(expectedEmail);
  const normalizedEmail = normalizeEmail(email);
  return !!normalizedExpectedEmail && normalizedExpectedEmail === normalizedEmail;
}

export function recordWrongInviteAccountAttempt() {
  if (!canUseSessionStorage()) {
    return null;
  }

  const currentState = readInviteFlowState();
  if (!currentState) {
    return null;
  }

  const nextState: InviteFlowState = {
    ...currentState,
    wrongAccountAttempts: currentState.wrongAccountAttempts + 1,
    updatedAt: Date.now(),
  };

  window.sessionStorage.setItem(INVITE_FLOW_STORAGE_KEY, JSON.stringify(nextState));

  const remainingAttempts = Math.max(0, MAX_INVITE_WRONG_ACCOUNT_ATTEMPTS - nextState.wrongAccountAttempts);

  return {
    state: nextState,
    remainingAttempts,
    exhausted: nextState.wrongAccountAttempts >= MAX_INVITE_WRONG_ACCOUNT_ATTEMPTS,
  };
}
