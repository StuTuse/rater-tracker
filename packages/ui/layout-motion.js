// Saved state owns layout. These finite animations only connect its old and new geometry.
export function createLayoutMotion(motion, visible = () => !document.hidden) {
  const active = new Map();
  const stop = element => {
    active.get(element)?.forEach(animation => animation.cancel());
    active.delete(element);
  };
  const cancel = () => { [...active.keys()].forEach(stop); };
  const animate = (element, frames, id) => {
    if (motion() === 'off' || !visible() || !element.isConnected) return;
    const animation = element.animate(frames, {
      duration: motion() === 'full' ? 260 : 130,
      easing: 'cubic-bezier(.22,.8,.25,1)'
    });
    animation.id = id;
    const list = active.get(element) ?? new Set(); list.add(animation); active.set(element, list);
    const finish = () => { list.delete(animation); if (!list.size && active.get(element) === list) active.delete(element); };
    animation.finished.then(finish, finish);
  };
  const resize = (element, before) => {
    stop(element);
    const after = element.getBoundingClientRect().height;
    if (Math.abs(before - after) > 1) animate(element, [
      { height: `${before}px`, overflow: 'clip' }, { height: `${after}px`, overflow: 'clip' }
    ], 'layout-resize');
  };
  const capture = root => new Map([...root.querySelectorAll('.rating-card,.task-card')].map(element => [element, element.getBoundingClientRect()]));
  const reconcile = (root, before, changes = false) => {
    for (const element of root.querySelectorAll('.rating-card,.task-card')) {
      const old = before.get(element);
      if (!old) {
        if (changes) animate(element, motion() === 'full' ? [{ opacity: .8, translate: '0 6px' }, { opacity: 1, translate: '0 0' }] : [{ opacity:.88 }, { opacity:1 }], 'item-enter');
        continue;
      }
      stop(element);
      const next = element.getBoundingClientRect();
      resize(element, old.height);
      if (changes && motion() === 'full' && (Math.abs(old.top - next.top) > 1 || Math.abs(old.left - next.left) > 1)) {
        animate(element, [{ translate: `${old.left - next.left}px ${old.top - next.top}px` }, { translate: '0 0' }], 'layout-shift');
      }
    }
  };
  return { capture, reconcile, resize, cancel };
}
