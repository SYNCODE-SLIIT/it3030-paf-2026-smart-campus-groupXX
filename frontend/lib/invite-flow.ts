export interface InviteFlowState {
  expectedEmail: string;
  wrongAccountAttempts: number;
}

export const MAX_INVITE_WRONG_ACCOUNT_ATTEMPTS = 3;

const INVITE_FLOW_STORAGE_KEY = 'smart-campus.invite-flow';

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? null;
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
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

    if (!expectedEmail) {
      return null;
    }

    return {
      expectedEmail,
      wrongAccountAttempts,
    };
  } catch {
    return null;
  }
}

export function primeInviteFlowState(expectedEmail: string | null | undefined) {
  const normalizedEmail = normalizeEmail(expectedEmail);
  if (!canUseSessionStorage() || !normalizedEmail) {
    return null;
  }

  const currentState = readInviteFlowState();
  if (currentState?.expectedEmail === normalizedEmail) {
    return currentState;
  }

  const nextState: InviteFlowState = {
    expectedEmail: normalizedEmail,
    wrongAccountAttempts: 0,
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

export function isInviteFlowEmailMatch(expectedState: InviteFlowState | null, email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);
  return !!expectedState?.expectedEmail && expectedState.expectedEmail === normalizedEmail;
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
  };

  window.sessionStorage.setItem(INVITE_FLOW_STORAGE_KEY, JSON.stringify(nextState));

  const remainingAttempts = Math.max(0, MAX_INVITE_WRONG_ACCOUNT_ATTEMPTS - nextState.wrongAccountAttempts);

  return {
    state: nextState,
    remainingAttempts,
    exhausted: nextState.wrongAccountAttempts >= MAX_INVITE_WRONG_ACCOUNT_ATTEMPTS,
  };
}
