// The static splash is painted before storage opens, in the same desktop window.
// Startup readiness includes this hand-off; reloads within the app never replay it.
export async function finishStartup(mode = 'gentle', reveal = () => {}) {
  const splash = document.querySelector('#startup');
  if (!splash) return;
  const app = document.querySelector('#app');
  await splash.querySelector('img').decode().catch(() => {});
  await new Promise(resolve => setTimeout(resolve, Math.max(0, 1200 - performance.now())));
  document.body.classList.add('is-revealing');
  try {
    reveal();
    const duration = mode === 'off' ? 0 : mode === 'full' ? 320 : 150;
    if (duration && !document.hidden) {
      await splash.animate([{ opacity: 1 }, { opacity: 0 }], {
        id: 'startup-exit', duration, easing: 'cubic-bezier(.22,.8,.25,1)', fill: 'forwards'
      }).finished.catch(() => {});
    }
  } finally {
    splash.remove();
    document.body.classList.remove('is-starting', 'is-revealing');
    app.inert = false;
    app.removeAttribute('aria-busy');
  }
}
