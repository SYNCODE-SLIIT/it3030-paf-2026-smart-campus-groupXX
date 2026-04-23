'use client';

import React from 'react';
import type { EmailOtpType, Session } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';

import { Card } from '@/components/ui';
import { ApiError, getErrorMessage, syncSession } from '@/lib/api-client';
import { getPostAuthRedirect } from '@/lib/auth-routing';
import {
  clearInviteFlowState,
  clearPreservedInviteSession,
  isInviteExpectedEmailMatch,
  primeInviteFlowState,
  readPreservedInviteSession,
  readInviteFlowState,
  recordWrongInviteAccountAttempt,
  resolveInviteExpectedEmail,
} from '@/lib/invite-flow';
import {
  clearRecoveryFlowState,
  isRecoveryExpectedEmailMatch,
  primeRecoveryFlowState,
  readRecoveryFlowState,
  resolveRecoveryExpectedEmail,
} from '@/lib/recovery-flow';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]);

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && EMAIL_OTP_TYPES.has(value as EmailOtpType);
}

function parseHashParams() {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;

  return new URLSearchParams(hash);
}

function AuthCallbackView({ statusMessage }: { statusMessage: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background:
          'radial-gradient(circle at top left, rgba(238,202,68,.18), transparent 28%), linear-gradient(180deg, var(--bg-subtle) 0%, var(--bg) 100%)',
      }}
    >
      <Card style={{ width: '100%', maxWidth: 520 }}>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--text-h)',
          }}
        >
          Authenticating
        </p>
        <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body)' }}>{statusMessage}</p>
      </Card>
    </div>
  );
}

function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = React.useState('Completing secure sign-in...');

  React.useEffect(() => {
    let cancelled = false;

    const completeAuth = async () => {
      const queryFlow = searchParams.get('flow');
      const queryType = searchParams.get('type');
      const queryInviteEmailHint = searchParams.get('invite_email') ?? searchParams.get('email');
      const queryRecoveryEmailHint = searchParams.get('recovery_email') ?? searchParams.get('email');
      const hashParams = parseHashParams();
      const hashType = hashParams.get('type');
      const isInviteGoogleFlow = queryFlow === 'invite-google';
      const isInviteMicrosoftFlow = queryFlow === 'invite-microsoft';
      const isInviteOAuthFlow = isInviteGoogleFlow || isInviteMicrosoftFlow;
      const isInviteLinkFlow = queryFlow === 'invite' || queryType === 'invite' || hashType === 'invite';
      const isInviteFlow = isInviteOAuthFlow || isInviteLinkFlow;
      const isRecoveryGoogleFlow = queryFlow === 'recovery-google';
      const isRecoveryMicrosoftFlow = queryFlow === 'recovery-microsoft';
      const isRecoveryOAuthFlow = isRecoveryGoogleFlow || isRecoveryMicrosoftFlow;
      const isRecoveryLinkFlow = queryFlow === 'recovery' || queryType === 'recovery' || hashType === 'recovery';
      const isRecoveryFlow = isRecoveryOAuthFlow || isRecoveryLinkFlow;
      let receivedFreshAuthPayload = false;

      const toInviteWelcome = (
        reason?: string,
        nextPath?: string,
        remainingAttempts?: number,
        inviteEmail?: string,
      ) => {
        const params = new URLSearchParams();
        if (reason) {
          params.set('reason', reason);
        }
        if (nextPath) {
          params.set('next', nextPath);
        }
        if (typeof remainingAttempts === 'number') {
          params.set('remaining', String(remainingAttempts));
        }
        if (inviteEmail) {
          params.set('email', inviteEmail);
        }

        const query = params.toString();
        return query ? `/auth/welcome?${query}` : '/auth/welcome';
      };

      const toRecoveryWelcome = (reason?: string, recoveryEmail?: string) => {
        const params = new URLSearchParams();
        params.set('flow', 'recovery');
        if (reason) {
          params.set('reason', reason);
        }
        if (recoveryEmail) {
          params.set('email', recoveryEmail);
        }

        return `/auth/welcome?${params.toString()}`;
      };

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        router.replace(
          isInviteFlow
            ? toInviteWelcome('auth_failed')
            : isRecoveryFlow
              ? toRecoveryWelcome('auth_failed', queryRecoveryEmailHint ?? undefined)
              : '/login?reason=auth_failed',
        );
        return;
      }

      const restorePreservedInviteSession = async () => {
        const preservedSession = readPreservedInviteSession();

        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // Continue: the next setSession call replaces any stale OAuth session.
        }

        if (!preservedSession) {
          return false;
        }

        const restored = await supabase.auth.setSession({
          access_token: preservedSession.accessToken,
          refresh_token: preservedSession.refreshToken,
        });

        if (restored.error || !restored.data.session?.access_token) {
          clearPreservedInviteSession();
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch {
            // Best-effort cleanup only.
          }
          return false;
        }

        return true;
      };

      const expireInviteAfterWrongAttempts = async (expectedInviteEmail: string) => {
        clearInviteFlowState();
        clearPreservedInviteSession();
        await supabase.auth.signOut({ scope: 'local' });
        router.replace(toInviteWelcome('invite_expired', undefined, undefined, expectedInviteEmail));
      };

      const rejectWrongInviteAccount = async (expectedInviteEmail: string) => {
        if (!readInviteFlowState()) {
          primeInviteFlowState(expectedInviteEmail);
        }

        const retryState = recordWrongInviteAccountAttempt();

        if (retryState?.exhausted) {
          await expireInviteAfterWrongAttempts(expectedInviteEmail);
          return;
        }

        await restorePreservedInviteSession();
        router.replace(toInviteWelcome('wrong_account', undefined, retryState?.remainingAttempts, expectedInviteEmail));
      };

      const isMissingRefreshTokenError = (error: unknown) => {
        if (!error || typeof error !== 'object') {
          return false;
        }

        const maybeError = error as { code?: string; message?: string };
        const code = maybeError.code?.toLowerCase() ?? '';
        const message = maybeError.message?.toLowerCase() ?? '';

        return code === 'refresh_token_not_found' || message.includes('refresh token not found');
      };

      const loadExistingSession = async () => {
        try {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            if (isMissingRefreshTokenError(error)) {
              try {
                await supabase.auth.signOut({ scope: 'local' });
              } catch {
                // Best-effort cleanup only.
              }
            }

            return null;
          }

          return session;
        } catch (error) {
          if (isMissingRefreshTokenError(error)) {
            try {
              await supabase.auth.signOut({ scope: 'local' });
            } catch {
              // Best-effort cleanup only.
            }
          }

          return null;
        }
      };

      try {
        const queryError = searchParams.get('error') ?? hashParams.get('error');
        const queryErrorCode = searchParams.get('error_code') ?? hashParams.get('error_code');
        const queryErrorDescription = (
          searchParams.get('error_description') ?? hashParams.get('error_description')
        )?.toLowerCase();
        const queryCode = searchParams.get('code');
        const queryAccessToken = searchParams.get('access_token');
        const queryRefreshToken = searchParams.get('refresh_token');
        const queryTokenHash = searchParams.get('token_hash');
        const providerMissingEmail =
          queryError === 'server_error' &&
          queryErrorCode === 'unexpected_failure' &&
          queryErrorDescription?.includes('user email from external provider');

        if (queryError) {
          if (queryErrorCode === 'otp_expired' || queryErrorDescription?.includes('expired')) {
            router.replace(
              isInviteFlow
                ? toInviteWelcome('invite_expired')
                : isRecoveryFlow
                  ? toRecoveryWelcome('recovery_expired', queryRecoveryEmailHint ?? undefined)
                  : '/login?reason=auth_failed',
            );
            return;
          }

          if (providerMissingEmail) {
            router.replace(
              isInviteFlow
                ? toInviteWelcome('provider_email_missing')
                : isRecoveryFlow
                  ? toRecoveryWelcome('provider_email_missing', queryRecoveryEmailHint ?? undefined)
                  : '/login?reason=provider_email_missing',
            );
            return;
          }

          router.replace(
            isInviteFlow
              ? toInviteWelcome('auth_failed')
              : isRecoveryFlow
                ? toRecoveryWelcome('auth_failed', queryRecoveryEmailHint ?? undefined)
                : '/login?reason=auth_failed',
          );
          return;
        }

        let accessToken: string | null = null;

        const confirmBrowserSession = async (candidateSession?: Session | null) => {
          const session = await loadExistingSession();
          if (session?.access_token) {
            return session.access_token;
          }

          if (candidateSession?.access_token && candidateSession.refresh_token) {
            const restored = await supabase.auth.setSession({
              access_token: candidateSession.access_token,
              refresh_token: candidateSession.refresh_token,
            });

            if (!restored.error && restored.data.session?.access_token) {
              return restored.data.session.access_token;
            }
          }

          return null;
        };

        const hasDirectSessionPayload =
          (queryAccessToken && queryRefreshToken) ||
          (hashParams.get('access_token') && hashParams.get('refresh_token'));
        const hasEmailTokenPayload = queryTokenHash && isEmailOtpType(queryType);

        if (hasDirectSessionPayload || hasEmailTokenPayload) {
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch {
            // Continue: the fresh link payload below replaces any stale browser session.
          }
        }

        if (queryCode) {
          receivedFreshAuthPayload = true;
          setStatusMessage('Verifying your login code...');
          const authResult = await supabase.auth.exchangeCodeForSession(queryCode);
          if (authResult.error) {
            accessToken = await confirmBrowserSession();
            if (!accessToken) {
              throw authResult.error;
            }
          } else {
            accessToken = await confirmBrowserSession(authResult.data.session);
          }
        } else if (queryAccessToken && queryRefreshToken) {
          receivedFreshAuthPayload = true;
          setStatusMessage('Finalizing your authentication session...');
          const authResult = await supabase.auth.setSession({
            access_token: queryAccessToken,
            refresh_token: queryRefreshToken,
          });
          if (authResult.error) {
            accessToken = await confirmBrowserSession();
            if (!accessToken) {
              throw authResult.error;
            }
          } else {
            accessToken = await confirmBrowserSession(authResult.data.session);
          }
        } else if (hashParams.get('access_token') && hashParams.get('refresh_token')) {
          receivedFreshAuthPayload = true;
          setStatusMessage(isRecoveryFlow ? 'Validating your recovery link...' : 'Validating your invitation link...');
          const authResult = await supabase.auth.setSession({
            access_token: hashParams.get('access_token')!,
            refresh_token: hashParams.get('refresh_token')!,
          });
          if (authResult.error) {
            accessToken = await confirmBrowserSession();
            if (!accessToken) {
              throw authResult.error;
            }
          } else {
            accessToken = await confirmBrowserSession(authResult.data.session);
          }
        } else if (queryTokenHash && isEmailOtpType(queryType)) {
          receivedFreshAuthPayload = true;
          setStatusMessage('Verifying your email token...');
          const authResult = await supabase.auth.verifyOtp({
            token_hash: queryTokenHash,
            type: queryType,
          });
          if (authResult.error) {
            accessToken = await confirmBrowserSession();
            if (!accessToken) {
              throw authResult.error;
            }
          } else {
            accessToken = await confirmBrowserSession(authResult.data.session);
          }
        } else {
          accessToken = await confirmBrowserSession();
        }

        if (!accessToken) {
          if (isInviteFlow) {
            router.replace(toInviteWelcome('auth_required', undefined, undefined, queryInviteEmailHint ?? undefined));
          } else if (isRecoveryFlow) {
            router.replace(toRecoveryWelcome('auth_required', queryRecoveryEmailHint ?? undefined));
          } else {
            router.replace('/login?reason=auth_failed');
          }
          return;
        }

        if (isInviteFlow) {
          if (queryInviteEmailHint) {
            primeInviteFlowState(queryInviteEmailHint, { resetWrongAccountAttempts: true });
          }

          const inviteFlowState = readInviteFlowState();
          const expectedInviteEmail = resolveInviteExpectedEmail(inviteFlowState?.expectedEmail, queryInviteEmailHint);

          const {
            data: { session: inviteSession },
          } = await supabase.auth.getSession();

          const shouldRequireAccountSwitch =
            !!expectedInviteEmail &&
            !!inviteSession?.user?.email &&
            !receivedFreshAuthPayload &&
            !isInviteExpectedEmailMatch(expectedInviteEmail, inviteSession.user.email);

          if (shouldRequireAccountSwitch) {
            router.replace(toInviteWelcome('switch_account', undefined, undefined, expectedInviteEmail));
            return;
          }
        }

        if (isRecoveryFlow) {
          if (queryRecoveryEmailHint) {
            primeRecoveryFlowState(queryRecoveryEmailHint);
          }

          const recoveryFlowState = readRecoveryFlowState();
          const expectedRecoveryEmail = resolveRecoveryExpectedEmail(
            recoveryFlowState?.expectedEmail,
            queryRecoveryEmailHint,
          );

          const {
            data: { session: recoverySession },
          } = await supabase.auth.getSession();

          const shouldRejectStaleRecoverySession =
            !!expectedRecoveryEmail &&
            !!recoverySession?.user?.email &&
            !receivedFreshAuthPayload &&
            !isRecoveryExpectedEmailMatch(expectedRecoveryEmail, recoverySession.user.email);

          if (shouldRejectStaleRecoverySession) {
            router.replace(toRecoveryWelcome('wrong_account', expectedRecoveryEmail));
            return;
          }
        }

        setStatusMessage('Finalizing your Smart Campus access...');
        let synced: Awaited<ReturnType<typeof syncSession>>;
        try {
          synced = await syncSession(accessToken);
        } catch (error) {
          const accessDenied = error instanceof ApiError && (error.status === 401 || error.status === 403);
          const currentSession = await loadExistingSession();
          const currentSessionEmail = currentSession?.user?.email ?? null;
          const inviteFlowState = readInviteFlowState();
          const expectedInviteEmail = resolveInviteExpectedEmail(inviteFlowState?.expectedEmail, queryInviteEmailHint);
          const recoveryFlowState = readRecoveryFlowState();
          const expectedRecoveryEmail = resolveRecoveryExpectedEmail(
            recoveryFlowState?.expectedEmail,
            queryRecoveryEmailHint,
          );

          const mismatchedInviteSession =
            isInviteFlow &&
            !!expectedInviteEmail &&
            !!currentSessionEmail &&
            !isInviteExpectedEmailMatch(expectedInviteEmail, currentSessionEmail);
          const mismatchedRecoverySession =
            isRecoveryFlow &&
            !!expectedRecoveryEmail &&
            !!currentSessionEmail &&
            !isRecoveryExpectedEmailMatch(expectedRecoveryEmail, currentSessionEmail);

          if (mismatchedInviteSession) {
            if (receivedFreshAuthPayload) {
              await rejectWrongInviteAccount(expectedInviteEmail);
            } else {
              router.replace(toInviteWelcome('switch_account', undefined, undefined, expectedInviteEmail));
            }
            return;
          }

          if (mismatchedRecoverySession) {
            clearRecoveryFlowState();
            await supabase.auth.signOut({ scope: 'local' });
            router.replace(toRecoveryWelcome('wrong_account', expectedRecoveryEmail));
            return;
          }

          if (accessDenied) {
            await supabase.auth.signOut({ scope: 'local' });
            router.replace(
              isInviteFlow
                ? toInviteWelcome('access_denied', undefined, undefined, expectedInviteEmail ?? undefined)
                : isRecoveryFlow
                  ? toRecoveryWelcome('access_denied', expectedRecoveryEmail ?? undefined)
                  : '/login?reason=access_denied',
            );
            return;
          }

          if (currentSession?.access_token && isInviteFlow) {
            primeInviteFlowState(expectedInviteEmail ?? currentSessionEmail);
            router.replace(toInviteWelcome(undefined, undefined, undefined, currentSessionEmail ?? undefined));
            return;
          }

          if (currentSession?.access_token && isRecoveryFlow) {
            primeRecoveryFlowState(expectedRecoveryEmail ?? currentSessionEmail);
            router.replace(toRecoveryWelcome(undefined, currentSessionEmail ?? undefined));
            return;
          }

          throw error;
        }
        const syncedUserEmail = synced.user.email;

        if (isInviteFlow) {
          const inviteFlowState = readInviteFlowState();
          const expectedInviteEmail = resolveInviteExpectedEmail(inviteFlowState?.expectedEmail, queryInviteEmailHint);

          if (expectedInviteEmail && !isInviteExpectedEmailMatch(expectedInviteEmail, syncedUserEmail)) {
            await rejectWrongInviteAccount(expectedInviteEmail);
            return;
          }

          primeInviteFlowState(expectedInviteEmail ?? syncedUserEmail);
        }

        if (isRecoveryFlow) {
          const recoveryFlowState = readRecoveryFlowState();
          const expectedRecoveryEmail = resolveRecoveryExpectedEmail(
            recoveryFlowState?.expectedEmail,
            queryRecoveryEmailHint,
          );

          if (expectedRecoveryEmail && !isRecoveryExpectedEmailMatch(expectedRecoveryEmail, syncedUserEmail)) {
            clearRecoveryFlowState();
            await supabase.auth.signOut({ scope: 'local' });
            router.replace(toRecoveryWelcome('wrong_account', expectedRecoveryEmail));
            return;
          }

          primeRecoveryFlowState(expectedRecoveryEmail ?? syncedUserEmail);
        }

        const nextPath = getPostAuthRedirect(synced.user, synced.nextStep);

        if (cancelled) {
          return;
        }

        if (isInviteOAuthFlow) {
          clearInviteFlowState();
          clearPreservedInviteSession();
          router.replace(nextPath);
          return;
        }

        if (isInviteLinkFlow) {
          router.replace(toInviteWelcome(undefined, undefined, undefined, syncedUserEmail));
          return;
        }

        if (isRecoveryOAuthFlow) {
          clearRecoveryFlowState();
          router.replace(nextPath);
          return;
        }

        if (isRecoveryLinkFlow) {
          router.replace(toRecoveryWelcome(undefined, syncedUserEmail));
          return;
        }

        router.replace(nextPath);
      } catch (error) {
        const accessDenied = error instanceof ApiError && (error.status === 401 || error.status === 403);
        const failedSession = await loadExistingSession();
        const inviteFlowState = readInviteFlowState();
        const expectedInviteEmail = resolveInviteExpectedEmail(inviteFlowState?.expectedEmail, queryInviteEmailHint);
        const recoveryFlowState = readRecoveryFlowState();
        const expectedRecoveryEmail = resolveRecoveryExpectedEmail(
          recoveryFlowState?.expectedEmail,
          queryRecoveryEmailHint,
        );

        const shouldRequireAccountSwitch =
          isInviteFlow &&
          accessDenied &&
          !!expectedInviteEmail &&
          !!failedSession?.user?.email &&
          !receivedFreshAuthPayload &&
          !isInviteExpectedEmailMatch(expectedInviteEmail, failedSession.user.email);

        if (shouldRequireAccountSwitch) {
          router.replace(toInviteWelcome('switch_account', undefined, undefined, expectedInviteEmail));
          return;
        }

        const wrongInviteAccount =
          isInviteFlow &&
          accessDenied &&
          !!expectedInviteEmail &&
          !!failedSession?.user?.email &&
          receivedFreshAuthPayload &&
          !isInviteExpectedEmailMatch(expectedInviteEmail, failedSession.user.email);

        if (wrongInviteAccount) {
          await rejectWrongInviteAccount(expectedInviteEmail);
          return;
        }

        const wrongRecoveryAccount =
          isRecoveryFlow &&
          accessDenied &&
          !!expectedRecoveryEmail &&
          !!failedSession?.user?.email &&
          !isRecoveryExpectedEmailMatch(expectedRecoveryEmail, failedSession.user.email);

        if (wrongRecoveryAccount) {
          clearRecoveryFlowState();
          await supabase.auth.signOut({ scope: 'local' });
          router.replace(toRecoveryWelcome('wrong_account', expectedRecoveryEmail));
          return;
        }

        const mismatchedInviteSession =
          isInviteFlow &&
          !!expectedInviteEmail &&
          !!failedSession?.user?.email &&
          !isInviteExpectedEmailMatch(expectedInviteEmail, failedSession.user.email);

        if (mismatchedInviteSession) {
          if (receivedFreshAuthPayload) {
            await rejectWrongInviteAccount(expectedInviteEmail);
          } else {
            router.replace(toInviteWelcome('switch_account', undefined, undefined, expectedInviteEmail));
          }
          return;
        }

        const mismatchedRecoverySession =
          isRecoveryFlow &&
          !!expectedRecoveryEmail &&
          !!failedSession?.user?.email &&
          !isRecoveryExpectedEmailMatch(expectedRecoveryEmail, failedSession.user.email);

        if (mismatchedRecoverySession) {
          clearRecoveryFlowState();
          await supabase.auth.signOut({ scope: 'local' });
          router.replace(toRecoveryWelcome('wrong_account', expectedRecoveryEmail));
          return;
        }

        if (accessDenied) {
          await supabase.auth.signOut({ scope: 'local' });
          router.replace(
            isInviteFlow
              ? toInviteWelcome('access_denied', undefined, undefined, expectedInviteEmail ?? undefined)
              : isRecoveryFlow
                ? toRecoveryWelcome('access_denied', expectedRecoveryEmail ?? undefined)
              : '/login?reason=access_denied',
          );
          return;
        }

        if (isMissingRefreshTokenError(error)) {
          router.replace(
            isInviteFlow
              ? toInviteWelcome('auth_required', undefined, undefined, expectedInviteEmail ?? undefined)
              : isRecoveryFlow
                ? toRecoveryWelcome('auth_required', expectedRecoveryEmail ?? undefined)
                : '/login?reason=auth_required',
          );
          return;
        }

        if (failedSession?.access_token && isInviteFlow) {
          primeInviteFlowState(expectedInviteEmail ?? failedSession.user.email);
          router.replace(toInviteWelcome(undefined, undefined, undefined, failedSession.user.email ?? undefined));
          return;
        }

        if (failedSession?.access_token && isRecoveryFlow) {
          primeRecoveryFlowState(expectedRecoveryEmail ?? failedSession.user.email);
          router.replace(toRecoveryWelcome(undefined, failedSession.user.email ?? undefined));
          return;
        }

        await supabase.auth.signOut({ scope: 'local' });

        console.error(getErrorMessage(error, 'Authentication callback failed.'));
        router.replace(
          isInviteFlow
            ? toInviteWelcome('auth_failed')
            : isRecoveryFlow
              ? toRecoveryWelcome('auth_failed', expectedRecoveryEmail ?? undefined)
              : '/login?reason=auth_failed',
        );
      }
    };

    void completeAuth();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return <AuthCallbackView statusMessage={statusMessage} />;
}

export default function AuthCallbackPage() {
  return (
    <React.Suspense fallback={<AuthCallbackView statusMessage="Completing secure sign-in..." />}>
      <AuthCallbackClient />
    </React.Suspense>
  );
}
