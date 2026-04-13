'use client';

import React from 'react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';

import { Card } from '@/components/ui';
import { ApiError, getErrorMessage, syncSession } from '@/lib/api-client';
import { getPostAuthRedirect } from '@/lib/auth-routing';
import {
  clearInviteFlowState,
  isInviteFlowEmailMatch,
  primeInviteFlowState,
  readInviteFlowState,
  recordWrongInviteAccountAttempt,
} from '@/lib/invite-flow';
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
      const hashParams = parseHashParams();
      const hashType = hashParams.get('type');
      const isInviteGoogleFlow = queryFlow === 'invite-google';
      const isInviteLinkFlow = queryFlow === 'invite' || queryType === 'invite' || hashType === 'invite';
      const isInviteFlow = isInviteGoogleFlow || isInviteLinkFlow;

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

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        router.replace(isInviteFlow ? toInviteWelcome('auth_failed') : '/login?reason=auth_failed');
        return;
      }

      try {
        const queryError = searchParams.get('error');
        const queryCode = searchParams.get('code');
        const queryAccessToken = searchParams.get('access_token');
        const queryRefreshToken = searchParams.get('refresh_token');
        const queryTokenHash = searchParams.get('token_hash');

        if (queryError) {
          router.replace(isInviteFlow ? toInviteWelcome('auth_failed') : '/login?reason=auth_failed');
          return;
        }
        let accessToken: string | null = null;

        const loadExistingAccessToken = async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          return session?.access_token ?? null;
        };

        if (queryCode) {
          setStatusMessage('Verifying your login code...');
          const authResult = await supabase.auth.exchangeCodeForSession(queryCode);
          if (authResult.error) {
            accessToken = await loadExistingAccessToken();
            if (!accessToken) {
              throw authResult.error;
            }
          } else {
            accessToken = authResult.data.session?.access_token ?? null;
          }
        } else if (queryAccessToken && queryRefreshToken) {
          setStatusMessage('Finalizing your authentication session...');
          const authResult = await supabase.auth.setSession({
            access_token: queryAccessToken,
            refresh_token: queryRefreshToken,
          });
          if (authResult.error) {
            throw authResult.error;
          }
          accessToken = authResult.data.session?.access_token ?? null;
        } else if (hashParams.get('access_token') && hashParams.get('refresh_token')) {
          setStatusMessage('Validating your invitation link...');
          const authResult = await supabase.auth.setSession({
            access_token: hashParams.get('access_token')!,
            refresh_token: hashParams.get('refresh_token')!,
          });
          if (authResult.error) {
            throw authResult.error;
          }
          accessToken = authResult.data.session?.access_token ?? null;
        } else if (queryTokenHash && isEmailOtpType(queryType)) {
          setStatusMessage('Verifying your email token...');
          const authResult = await supabase.auth.verifyOtp({
            token_hash: queryTokenHash,
            type: queryType,
          });
          if (authResult.error) {
            throw authResult.error;
          }
          accessToken = authResult.data.session?.access_token ?? null;
        } else {
          accessToken = await loadExistingAccessToken();
        }

        if (!accessToken) {
          if (isInviteFlow) {
            router.replace(toInviteWelcome('auth_required'));
          } else {
            router.replace('/login?reason=auth_failed');
          }
          return;
        }

        if (isInviteFlow) {
          const inviteFlowState = readInviteFlowState();
          const {
            data: { session: inviteSession },
          } = await supabase.auth.getSession();
          const inviteEmailMismatch =
            inviteFlowState &&
            !!inviteSession?.user?.email &&
            !isInviteFlowEmailMatch(inviteFlowState, inviteSession.user.email);

          if (inviteEmailMismatch) {
            const retryState = recordWrongInviteAccountAttempt();

            if (retryState?.exhausted) {
              clearInviteFlowState();
              await supabase.auth.signOut();
              router.replace(toInviteWelcome('invite_expired'));
              return;
            }

            router.replace(toInviteWelcome('wrong_account', undefined, retryState?.remainingAttempts));
            return;
          }
        }

        setStatusMessage('Finalizing your Smart Campus access...');
        const synced = await syncSession(accessToken);
        const syncedUserEmail = synced.user.email;
        primeInviteFlowState(synced.user.email);
        const nextPath = getPostAuthRedirect(synced.user, synced.nextStep);

        if (cancelled) {
          return;
        }

        if (isInviteGoogleFlow) {
          clearInviteFlowState();
          router.replace(nextPath);
          return;
        }

        if (isInviteLinkFlow) {
          router.replace(toInviteWelcome(undefined, undefined, undefined, syncedUserEmail));
          return;
        }

        router.replace(nextPath);
      } catch (error) {
        const accessDenied = error instanceof ApiError && (error.status === 401 || error.status === 403);
        const {
          data: { session: failedSession },
        } = await supabase.auth.getSession();
        const inviteFlowState = readInviteFlowState();
        const wrongInviteAccount =
          isInviteFlow &&
          accessDenied &&
          inviteFlowState &&
          !!failedSession?.user?.email &&
          !isInviteFlowEmailMatch(inviteFlowState, failedSession.user.email);

        if (wrongInviteAccount) {
          const retryState = recordWrongInviteAccountAttempt();

          if (retryState?.exhausted) {
            clearInviteFlowState();
            await supabase.auth.signOut();
            router.replace(toInviteWelcome('invite_expired', undefined, undefined, inviteFlowState.expectedEmail));
            return;
          }

          router.replace(
            toInviteWelcome('wrong_account', undefined, retryState?.remainingAttempts, inviteFlowState.expectedEmail),
          );
          return;
        }

        await supabase.auth.signOut();

        if (accessDenied) {
          router.replace(isInviteFlow ? toInviteWelcome('access_denied') : '/login?reason=access_denied');
          return;
        }

        console.error(getErrorMessage(error, 'Authentication callback failed.'));
        router.replace(isInviteFlow ? toInviteWelcome('auth_failed') : '/login?reason=auth_failed');
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
