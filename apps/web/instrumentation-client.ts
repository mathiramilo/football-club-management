function startSentry() {
  void import('./lib/sentry-client').then((sentry) => {
    sentry.startSentry();
  });
}

function startAnalytics() {
  void import('./lib/analytics').then((analytics) => {
    void analytics.loadAnalytics();
  });
}

function whenIdle(callback: () => void) {
  if ('requestIdleCallback' in window) window.requestIdleCallback(callback);
  else setTimeout(callback, 1);
}

function afterLoad(start: () => void) {
  if (document.readyState === 'complete') whenIdle(start);
  else
    window.addEventListener(
      'load',
      () => {
        whenIdle(start);
      },
      { once: true },
    );
}

if (process.env.NEXT_PUBLIC_SENTRY_DSN) afterLoad(startSentry);
if (process.env.NEXT_PUBLIC_POSTHOG_KEY) afterLoad(startAnalytics);
