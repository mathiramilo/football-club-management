function startSentry() {
  void import('./lib/sentry-client').then((sentry) => {
    sentry.startSentry();
  });
}

function whenIdle(callback: () => void) {
  if ('requestIdleCallback' in window) window.requestIdleCallback(callback);
  else setTimeout(callback, 1);
}

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  if (document.readyState === 'complete') whenIdle(startSentry);
  else
    window.addEventListener(
      'load',
      () => {
        whenIdle(startSentry);
      },
      { once: true },
    );
}
