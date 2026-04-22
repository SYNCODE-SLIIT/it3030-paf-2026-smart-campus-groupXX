'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { listenRouteProgressStart } from '@/lib/route-progress';

const START_PROGRESS = 8;
const MAX_IN_PROGRESS = 92;
const MIN_VISIBLE_MS = 220;
const COMPLETE_HIDE_DELAY_MS = 180;
const INCREMENT_INTERVAL_MS = 120;

function shouldTrackNavigation(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute('href');

  if (!href || href.startsWith('#')) {
    return false;
  }

  if (anchor.target === '_blank' || anchor.hasAttribute('download')) {
    return false;
  }

  const nextUrl = new URL(anchor.href, window.location.href);
  const currentUrl = new URL(window.location.href);

  if (nextUrl.origin !== currentUrl.origin) {
    return false;
  }

  return nextUrl.pathname !== currentUrl.pathname || nextUrl.search !== currentUrl.search;
}

export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousRouteRef = useRef<string | null>(null);

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const isActiveRef = useRef(false);
  const startedAtRef = useRef(0);
  const tickIntervalRef = useRef<number | null>(null);
  const finishTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const queuedStartTimeoutRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (tickIntervalRef.current !== null) {
      window.clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }

    if (finishTimeoutRef.current !== null) {
      window.clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }

    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (queuedStartTimeoutRef.current !== null) {
      window.clearTimeout(queuedStartTimeoutRef.current);
      queuedStartTimeoutRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (isActiveRef.current) {
      return;
    }

    clearTimers();
    isActiveRef.current = true;
    startedAtRef.current = Date.now();
    setVisible(true);
    setProgress(START_PROGRESS);

    tickIntervalRef.current = window.setInterval(() => {
      setProgress((previous) => {
        if (previous >= MAX_IN_PROGRESS) {
          return previous;
        }

        const step = Math.max((100 - previous) * 0.12, 1.2);
        return Math.min(previous + step, MAX_IN_PROGRESS);
      });
    }, INCREMENT_INTERVAL_MS);
  }, [clearTimers]);

  const scheduleStart = useCallback(() => {
    if (isActiveRef.current || queuedStartTimeoutRef.current !== null) {
      return;
    }

    queuedStartTimeoutRef.current = window.setTimeout(() => {
      queuedStartTimeoutRef.current = null;
      start();
    }, 0);
  }, [start]);

  const complete = useCallback(() => {
    if (!isActiveRef.current) {
      return;
    }

    isActiveRef.current = false;

    if (tickIntervalRef.current !== null) {
      window.clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }

    const elapsed = Date.now() - startedAtRef.current;
    const waitBeforeComplete = Math.max(MIN_VISIBLE_MS - elapsed, 0);

    finishTimeoutRef.current = window.setTimeout(() => {
      setProgress(100);

      hideTimeoutRef.current = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, COMPLETE_HIDE_DELAY_MS);
    }, waitBeforeComplete);
  }, []);

  useEffect(() => {
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a');
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (shouldTrackNavigation(anchor)) {
        scheduleStart();
      }
    };

    document.addEventListener('pointerdown', onDocumentPointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', onDocumentPointerDown, true);
    };
  }, [scheduleStart]);

  useEffect(() => {
    return listenRouteProgressStart(scheduleStart);
  }, [scheduleStart]);

  useEffect(() => {
    const onPopState = () => {
      scheduleStart();
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [scheduleStart]);

  useEffect(() => {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushState(...args) {
      scheduleStart();
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function replaceState(...args) {
      scheduleStart();
      return originalReplaceState.apply(this, args);
    };

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [scheduleStart]);

  useEffect(() => {
    const currentRoute = `${pathname}?${searchParams.toString()}`;
    const previousRoute = previousRouteRef.current;

    previousRouteRef.current = currentRoute;

    if (previousRoute === null || previousRoute === currentRoute) {
      return;
    }

    // Fallback: some navigations do not fire our early-start hooks.
    // Start here so users still see a transition indicator, then complete.
    if (!isActiveRef.current) {
      start();
    }

    complete();
  }, [pathname, searchParams, start, complete]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return (
    <div className={`route-progress${visible ? ' is-visible' : ''}`} aria-hidden="true">
      <div className="route-progress__bar" style={{ transform: `scaleX(${progress / 100})` }} />
    </div>
  );
}
