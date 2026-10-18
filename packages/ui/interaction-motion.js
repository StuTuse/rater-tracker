// Geometric feedback stays separate from persisted state. No cross-fade on save.
export function createInteractionMotion(mode) {
  const running = new Map();
  function cancel() { for (const animation of running.values()) animation.cancel(); running.clear(); }
  function capture(root) {
    const snapshots = new Map();
    for (const node of root.querySelectorAll('.record-body,.task-card,.day-review')) if (node.getClientRects().length) snapshots.set(node, node.getBoundingClientRect());
    return snapshots;
  }
  function settle(snapshots) {
    if (mode() === 'off' || document.hidden) { cancel(); return; }
    for (const [node, before] of snapshots) {
      if (!node.isConnected) continue;
      const after = node.getBoundingClientRect();
      let frames;
      if (node.matches('.record-body') && Math.abs(before.height - after.height) > 2) frames = [{ height:before.height+'px' }, { height:after.height+'px' }];
      else if (mode() === 'full' && Math.abs(before.y - after.y) > 2 && before.width === after.width) frames = [{ translate:`0 ${before.y-after.y}px` }, { translate:'0 0' }];
      if (!frames) continue;
      running.get(node)?.cancel();
      const animation = node.animate(frames, { duration:mode() === 'full' ? 230 : 120, easing:'cubic-bezier(.22,.8,.25,1)' });
      running.set(node, animation);
      animation.finished.then(() => { if (running.get(node) === animation) running.delete(node); }, () => {});
    }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
  return { capture, settle, cancel };
}
