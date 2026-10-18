// Animate independent content groups once, including all text and controls inside.
// Layout wrappers are traversed; nested elements never multiply parent opacity.
const groupSelector = '.page-header,.section-title,.toolbar,.badge-filters,.rating-card,.task-card,.panel,.history-recall,.day-recall,.calendar-grid,.history-tabs,.weekly-picker,.weekly-day-content,.coefficient-card,.badge-card,.empty,.gentle-note,.small-reflection,.summary-grid>div';
export function pageEntryGroups(root, scope = 'page') {
  if (!root) return [];
  let roots = [...root.children];
  if (scope === 'rewards') {
    roots = [];
    for (let node = root.querySelector('.reward-tabs')?.nextElementSibling; node; node = node.nextElementSibling) roots.push(node);
  } else if (scope === 'tasks') roots = [...root.querySelectorAll(':scope>.tasks-grid,:scope>.empty')];
  else if (scope === 'badges') roots = [...root.querySelectorAll('.badge-grid')];
  else if (scope === 'trend') roots = [...root.querySelectorAll('.trend-panel')];
  else if (scope === 'history') roots = [...root.children].filter(node => !node.matches('.page-header,.history-tabs'));
  else if (scope === 'recall') roots = [...root.querySelectorAll('.day-recall,.history-rating,.history-events')];
  else if (scope === 'calendar') roots = [...root.querySelectorAll('.history-recall .calendar-grid')];
  else if (scope === 'week') roots = [...root.querySelectorAll('.weekly-archive> :not(.weekly-picker)')];
  else if (scope === 'weekly-day') roots = [...root.querySelectorAll('.weekly-day-content')];
  const groups = [];
  const visit = node => {
    if (!node.getClientRects().length || node.hidden) return;
    if (node.matches(groupSelector) || !node.children.length) groups.push(node);
    else [...node.children].forEach(visit);
  };
  roots.forEach(visit);
  return groups;
}

export function createPageMotion(getRoot, motion) {
  const animations = new Set();
  let generation = 0;
  const cancel = () => {
    ++generation;
    animations.forEach(animation => animation.cancel()); animations.clear();
    const root = getRoot(); if (root) delete root.dataset.entering;
  };
  const play = (scope = 'page') => {
    cancel();
    const root = getRoot(), mode = motion();
    if (!root || mode === 'off' || document.hidden || globalThis.raterNative?.active===false) return;
    const token = generation, groups = pageEntryGroups(root, scope);
    if (!groups.length) return;
    root.dataset.entering = scope;
    groups.forEach((element, index) => {
      // Individual translate composes with existing hover/press transform effects.
      const frames = mode === 'full' ? [{ opacity: .82, translate:scope === 'page' ? '0 8px' : '0 4px' }, { opacity:1, translate:'0 0' }] : [{ opacity:.88 }, { opacity:1 }];
      const animation = element.animate(frames, { duration:mode === 'full' ? 280 : 140, delay:0, easing:'cubic-bezier(.22,.8,.25,1)' });
      animation.id = 'page-enter'; animations.add(animation);
      const finish = () => {
        animations.delete(animation);
        if (generation === token && !animations.size) delete root.dataset.entering;
      };
      animation.finished.then(finish, finish);
    });
  };
  return { play, cancel };
}
