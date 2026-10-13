import { updateDOM } from './dom.js';
import { enhanceControls, closeControlLayer } from './controls.js';

// Own geometry and cleanup separately: content never fades when changing tabs.
export function createModalController(dialog, motion, onClosed) {
  let generation = 0, resizeAnimation, closeTimer, lastFocused, contentKind;
  const layoutSize = () => {
    const style = getComputedStyle(dialog);
    return { width: parseFloat(style.width), height: parseFloat(style.height) };
  };
  const clearGeometry = () => {
    dialog.style.removeProperty('width');
    dialog.style.removeProperty('height');
    delete dialog.dataset.morphing;
  };
  const stop = () => {
    clearTimeout(closeTimer);
    resizeAnimation?.cancel();
    resizeAnimation = null;
  };
  return {
    open(contents, kind = '') {
      const wasClosing = dialog.hasAttribute('data-closing');
      const before = dialog.open || wasClosing ? layoutSize() : null;
      const token = ++generation;
      stop(); closeControlLayer({ immediate: true });
      if (!dialog.open && !wasClosing) lastFocused = document.activeElement;
      else if (!dialog.contains(document.activeElement)) lastFocused = document.activeElement;
      delete dialog.dataset.closing;
      dialog.inert = false;
      clearGeometry();
      dialog.dataset.kind = kind;
      dialog.setAttribute('aria-labelledby', 'modal-title');
      if (kind === 'account' && contentKind === 'account') updateDOM(dialog, contents);
      else dialog.innerHTML = contents;
      contentKind = kind;
      if (!dialog.open) dialog.showModal();
      enhanceControls(dialog);
      const after = layoutSize();
      if (before && motion() !== 'off' && (Math.abs(before.height - after.height) > 1 || Math.abs(before.width - after.width) > 1)) {
        dialog.dataset.morphing = '';
        dialog.style.width = `${after.width}px`;
        dialog.style.height = `${after.height}px`;
        resizeAnimation = dialog.animate([
          { width: `${before.width}px`, height: `${before.height}px` },
          { width: `${after.width}px`, height: `${after.height}px` }
        ], { duration: motion() === 'gentle' ? 150 : 420, easing: 'cubic-bezier(.22,.8,.25,1)' });
        resizeAnimation.finished.then(() => {
          if (token === generation) { clearGeometry(); resizeAnimation = null; }
        }, () => {});
      }
    },
    close() {
      if (!dialog.open) return;
      const rect = layoutSize(), kind = contentKind, token = ++generation;
      stop(); closeControlLayer({ immediate: true });
      dialog.style.width = `${rect.width}px`;
      dialog.style.height = `${rect.height}px`;
      delete dialog.dataset.morphing;
      dialog.dataset.closing = '';
      dialog.inert = true;
      // Keep kind, dimensions, scroll and fields unchanged until the fade finishes.
      const durations = getComputedStyle(dialog).transitionDuration.split(',').map(value => parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000));
      const duration = motion() === 'off' ? 0 : Math.max(0, ...durations);
      dialog.close();
      const finish = () => {
        if (token !== generation || dialog.open) return;
        onClosed?.(kind);
        delete dialog.dataset.closing;
        dialog.dataset.kind = '';
        dialog.inert = false;
        clearGeometry();
        lastFocused?.focus({ preventScroll: true });
      };
      if (!duration) finish();
      else closeTimer = setTimeout(finish, duration + 24);
    }
  };
}
