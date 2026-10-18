// Keep committed UI updates local so input, focus and running feedback survive.
const key = node => {
  if (node.nodeType !== 1) return '';
  if (node.id) return `id:${node.id}`;
  if (node.dataset.uiKey) return `ui:${node.dataset.uiKey}`;
  if (node.dataset.action) return `action:${node.dataset.action}:${['dimension', 'stars', 'task', 'progress', 'badge', 'filter', 'page', 'tab', 'series', 'range', 'date'].map(k => node.dataset[k] ?? '').join(':')}`;
  if (node.name) return `field:${node.name}`;
  if (node.classList.contains('rating-note')) return `note:${node.dataset.date}:${node.dataset.dimension}`;
  return '';
};
const compatible = (a, b) => a.nodeType === b.nodeType && (a.nodeType !== 1 || a.tagName === b.tagName) && key(a) === key(b);

export function updateDOM(parent, markup, { preserveInputs = true, starChanged = () => {} } = {}) {
  const template = document.createElement('template');
  template.innerHTML = markup;
  const patch = (old, next) => {
    if (old.nodeType !== 1) {
      if (old.nodeValue !== next.nodeValue) old.nodeValue = next.nodeValue;
      return;
    }
    const wasLit = old.classList.contains('lit'), isStar = old.classList.contains('star-button');
    const preview = isStar ? ['preview-lit', 'preview-dim'].filter(c => old.classList.contains(c)) : [];
    const preserveOpen = preserveInputs && old.tagName === 'DETAILS';
    for (const attr of [...old.attributes]) {
      if (preserveOpen && attr.name === 'open' || attr.name === 'data-preview') continue;
      if (!next.hasAttribute(attr.name)) old.removeAttribute(attr.name);
    }
    for (const attr of next.attributes) {
      if (preserveOpen && attr.name === 'open') continue;
      if (old.getAttribute(attr.name) !== attr.value) old.setAttribute(attr.name, attr.value);
    }
    if (preview.length) old.classList.add(...preview);
    if (old.tagName === 'TEXTAREA') {
      if (!preserveInputs || document.activeElement !== old && !old.closest('#references-form, #modal')) {
        if (old.value !== next.value) old.value = next.value;
      }
    } else {
      children(old, next);
      if (old.tagName === 'INPUT' && old.type !== 'checkbox' && (!preserveInputs || document.activeElement !== old && !old.closest('#modal'))) {
        if (old.value !== next.value) old.value = next.value;
      }
      if (old.tagName === 'SELECT' && (!preserveInputs || !old.closest('#modal'))) old.value = next.value;
      if (old.tagName === 'INPUT' && old.type === 'checkbox') old.checked = next.checked;
    }
    if (isStar && wasLit !== old.classList.contains('lit')) starChanged(old, old.classList.contains('lit'));
  };
  const children = (old, next) => {
    const persistent = node => node.nodeType === 1 && node.hasAttribute('data-persistent-ui');
    const available = [...old.childNodes].filter(node => !persistent(node));
    const nextManaged = node => {
      let nextNode = node;
      while (nextNode && persistent(nextNode)) nextNode = nextNode.nextSibling;
      return nextNode;
    };
    let cursor = nextManaged(old.firstChild);
    for (const desired of [...next.childNodes]) {
      const index = available.findIndex(node => compatible(node, desired));
      const node = index < 0 ? desired.cloneNode(true) : available.splice(index, 1)[0];
      if (node !== cursor) old.insertBefore(node, cursor);
      if (index >= 0) patch(node, desired);
      cursor = nextManaged(node.nextSibling);
    }
    for (const unused of available) unused.remove();
  };
  children(parent, template.content);
}
