// Animate independent content groups once, including all text and controls inside.
// Layout wrappers are traversed; nested elements never multiply parent opacity.
const groupSelector = '.page-header,.section-title,.toolbar,.badge-filters,.rating-card,.task-card,.panel,.coefficient-card,.badge-card,.empty,.gentle-note,.small-reflection,.summary-grid>div';
export function pageEntryGroups(root, scope = 'page') {
  if (!root) return [];
  let roots = [...root.children];
  if (scope === 'rewards') {
    roots = [];
    for (let node = root.querySelector('.reward-tabs')?.nextElementSibling; node; node = node.nextElementSibling) roots.push(node);
  } else if (scope === 'day') roots = [...root.querySelectorAll('.day-review,.ratings-grid>.rating-card,.history-events')];
  else if (scope === 'month') roots = [...root.querySelectorAll('.calendar-grid')];
  else if (scope === 'tasks') roots = [...root.querySelectorAll(':scope>.tasks-grid,:scope>.empty')];
  else if (scope === 'badges') roots = [...root.querySelectorAll('.badge-grid')];
  else if (scope === 'trend') roots = [...root.querySelectorAll('.trend-panel')];
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
  const ghosts = new Set();
  const localSelectors = {
    trend:'.rating-chart,.trend-labels',
    month:'.calendar-grid,.calendar-head h2',
    day:'.rating-chart,.trend-labels,.day-review,.ratings-grid,.history-rating-title,.history-events'
  };
  let generation = 0;
  const cancel = () => {
    ++generation;
    animations.forEach(animation => animation.cancel()); animations.clear();
    ghosts.forEach(node=>node.remove());ghosts.clear();
    const root = getRoot(); if (root) delete root.dataset.entering;
  };
  const capture = scope => {
    if(!localSelectors[scope] || motion()==='off' || document.hidden)return [];
    return [...getRoot().querySelectorAll(localSelectors[scope])].filter(n=>n.getClientRects().length).map(node=>{
      const clone=node.cloneNode(true),rect=node.getBoundingClientRect();
      clone.removeAttribute('id');clone.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
      clone.inert=true;clone.setAttribute('aria-hidden','true');
      // Fixed snapshots never participate in layout or hit testing. The live
      // controls update synchronously, including during rapid repeated taps.
      clone.style.cssText+=`;position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;margin:0;pointer-events:none;z-index:40;overflow:hidden`;
      return clone;
    });
  };
  const play = (scope = 'page', outgoing = []) => {
    cancel();
    const root = getRoot(), mode = motion();
    if (!root || mode === 'off' || document.hidden || globalThis.raterNative?.active===false) return;
    if(localSelectors[scope]) {
      const duration=mode==='full'?240:120;
      const track=(node,frames,ghost=false)=>{
        const a=node.animate(frames,{duration,easing:'ease-in-out'});a.id='content-crossfade';animations.add(a);
        a.finished.then(()=>{animations.delete(a);if(ghost){node.remove();ghosts.delete(node);}},()=>{});
      };
      outgoing.forEach(node=>{document.body.append(node);ghosts.add(node);track(node,[{opacity:1},{opacity:0}],true);});
      root.querySelectorAll(localSelectors[scope]).forEach(node=>track(node,[{opacity:0},{opacity:1}]));
      return;
    }
    const token = generation, groups = pageEntryGroups(root, scope);
    if (!groups.length) return;
    root.dataset.entering = scope;
    groups.forEach((element, index) => {
      // Individual translate composes with existing hover/press transform effects.
      const frames = mode === 'full' ? [{ opacity:0, translate:'0 12px' }, { opacity:1, translate:'0 0' }] : [{ opacity:0 }, { opacity:1 }];
      const animation = element.animate(frames, { duration:mode === 'full' ? 380 : 160, delay:mode === 'full' ? Math.min(index * 22, 132) : 0, easing:'cubic-bezier(.22,.8,.25,1)', fill:'backwards' });
      animation.id = 'page-enter'; animations.add(animation);
      const finish = () => {
        animations.delete(animation);
        if (generation === token && !animations.size) delete root.dataset.entering;
      };
      animation.finished.then(finish, finish);
    });
  };
  return { play, cancel, capture };
}
