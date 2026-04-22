const ROUTE_PROGRESS_START_EVENT = 'smart-campus:route-progress:start';

export function triggerRouteProgress() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(ROUTE_PROGRESS_START_EVENT));
}

export function listenRouteProgressStart(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = () => listener();
  window.addEventListener(ROUTE_PROGRESS_START_EVENT, handler);

  return () => {
    window.removeEventListener(ROUTE_PROGRESS_START_EVENT, handler);
  };
}
