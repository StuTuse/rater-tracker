import { icon } from './icons.js';
import { hongKong } from './core.js';

const pad = value => String(value).padStart(2, '0');
const escapeHTML = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

let activeControl = null;
let eventsInstalled = false;

function motionReduced() {
  return document.documentElement.dataset.motion === 'off'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function controlLabel(source) {
  const explicit = source.getAttribute('aria-label');
  if (explicit) return explicit;
  const label = source.closest('label');
  if (label) {
    const text = [...label.childNodes]
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent.trim())
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }
  return source.name || source.id || '选择';
}

function stableControlId(source, index) {
  if (source.id) return `id:${source.id}`;
  const form = source.closest('form');
  const scope = form?.id || source.closest('dialog')?.id || 'page';
  return `${scope}:${source.name || `${source.type}:${index}`}`;
}

function formatDate(value) {
  if (!value) return '选择日期';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return `${year}年${month}月${day}日`;
}

function triggerValue(source) {
  if (source.tagName === 'SELECT') {
    return source.selectedOptions[0]?.textContent?.trim() || '请选择';
  }
  return formatDate(source.value);
}

function syncTrigger(source, trigger) {
  const value = triggerValue(source);
  const isDate = source.type === 'date';
  trigger.classList.toggle('is-placeholder', !source.value);
  trigger.innerHTML = `
    <span class="control-trigger-value">${escapeHTML(value)}</span>
    <span class="control-trigger-icon${isDate ? ' is-calendar-icon' : ''}" aria-hidden="true">${icon(isDate ? 'calendar' : 'chevron')}</span>
  `;
  trigger.setAttribute('aria-label', `${controlLabel(source)}，当前${value}`);
}

function positionPopover(state = activeControl) {
  if (!state?.popup?.isConnected || !state.trigger?.isConnected) return;
  const rect = state.trigger.getBoundingClientRect();
  const gutter = 12;
  const preferredWidth = state.type === 'date' ? 326 : Math.max(220, rect.width);
  const width = Math.min(preferredWidth, window.innerWidth - gutter * 2);
  state.popup.style.width = `${width}px`;
  state.popup.style.left = `${Math.min(Math.max(gutter, rect.left), window.innerWidth - width - gutter)}px`;
  const height = state.popup.getBoundingClientRect().height;
  const below = rect.bottom + 8;
  const above = rect.top - height - 8;
  const top = below + height <= window.innerHeight - gutter || above < gutter ? below : above;
  state.popup.style.top = `${Math.max(gutter, Math.min(top, window.innerHeight - height - gutter))}px`;
  state.popup.style.setProperty('--popover-origin-x', `${Math.min(Math.max(rect.left + rect.width / 2 - parseFloat(state.popup.style.left), 24), width - 24)}px`);
}

function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function shiftMonth(date, offset) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

function renderSelect(state) {
  const options = [...state.source.options];
  state.popup.innerHTML = `
    <div class="control-menu" role="listbox" aria-label="${escapeHTML(controlLabel(state.source))}">
      ${options.map((option, index) => `
        <button class="control-option${option.selected ? ' is-selected' : ''}"
          type="button" role="option" aria-selected="${option.selected ? 'true' : 'false'}"
          data-control-option="${index}" ${option.disabled ? 'disabled' : ''}>
          <span>${escapeHTML(option.textContent)}</span>
          <span class="control-option-check" aria-hidden="true">${option.selected ? icon('check') : ''}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function monthOutsideBounds(month, source, direction) {
  const min = parseDate(source.min);
  const max = parseDate(source.max);
  if (direction < 0 && min) {
    return shiftMonth(month, -1) < new Date(Date.UTC(min.getUTCFullYear(), min.getUTCMonth(), 1));
  }
  if (direction > 0 && max) {
    return shiftMonth(month, 1) > new Date(Date.UTC(max.getUTCFullYear(), max.getUTCMonth(), 1));
  }
  return false;
}

function renderCalendar(state) {
  const month = state.month;
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const firstWeekday = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const min = state.source.min || '';
  const max = state.source.max || '';
  const today = hongKong().date;
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push('<span class="calendar-blank" aria-hidden="true"></span>');
  for (let day = 1; day <= days; day += 1) {
    const value = `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
    const disabled = (min && value < min) || (max && value > max);
    const selected = value === state.source.value;
    cells.push(`
      <button type="button" class="calendar-day${selected ? ' is-selected' : ''}${value === today ? ' is-today' : ''}"
        data-calendar-date="${value}" aria-label="${year}年${monthIndex + 1}月${day}日"
        aria-pressed="${selected ? 'true' : 'false'}" ${disabled ? 'disabled' : ''}>${day}</button>
    `);
  }
  const todayDisabled = (min && today < min) || (max && today > max);
  state.popup.innerHTML = `
    <div class="calendar-panel" role="dialog" aria-label="${escapeHTML(controlLabel(state.source))}">
      <div class="calendar-head">
        <button type="button" class="calendar-nav" data-calendar-nav="-1" aria-label="上个月" ${monthOutsideBounds(month, state.source, -1) ? 'disabled' : ''}>‹</button>
        <strong aria-live="polite">${year}年${monthIndex + 1}月</strong>
        <button type="button" class="calendar-nav" data-calendar-nav="1" aria-label="下个月" ${monthOutsideBounds(month, state.source, 1) ? 'disabled' : ''}>›</button>
      </div>
      <div class="calendar-weekdays" aria-hidden="true">
        ${['一', '二', '三', '四', '五', '六', '日'].map(day => `<span>${day}</span>`).join('')}
      </div>
      <div class="calendar-grid">${cells.join('')}</div>
      <div class="calendar-foot">
        <span>${escapeHTML(formatDate(state.source.value))}</span>
        <button type="button" class="calendar-today" data-calendar-today ${todayDisabled ? 'disabled' : ''}>回到今天</button>
      </div>
    </div>
  `;
}

function renderActiveControl() {
  if (!activeControl) return;
  if (activeControl.type === 'select') renderSelect(activeControl);
  else renderCalendar(activeControl);
  positionPopover(activeControl);
}

function closeControl({ focus = false, immediate = false } = {}) {
  if (immediate) document.querySelectorAll('.control-popover.is-closing').forEach(popup => popup.remove());
  if (!activeControl) return;
  const state = activeControl;
  activeControl = null;
  state.trigger.setAttribute('aria-expanded', 'false');
  state.trigger.classList.remove('is-open');
  state.popup.classList.remove('is-open');
  state.popup.classList.add('is-closing');
  state.popup.setAttribute('aria-hidden', 'true');
  state.popup.inert = true;
  const remove = () => state.popup.remove();
  if (immediate || motionReduced()) remove();
  else {
    state.popup.addEventListener('transitionend', remove, { once: true });
    window.setTimeout(remove, 240);
  }
  if (focus && state.trigger.isConnected) state.trigger.focus({ preventScroll: true });
}

function openControl(source, trigger) {
  if (activeControl?.source === source) {
    closeControl({ focus: true });
    return;
  }
  closeControl({ immediate: true });
  const popup = document.createElement('div');
  const type = source.tagName === 'SELECT' ? 'select' : 'date';
  popup.className = `control-popover ${type}-popover`;
  popup.dataset.controlPopup = type;
  popup.setAttribute('popover', 'manual');
  (source.closest('dialog') || document.querySelector('#control-layer'))?.append(popup);
  popup.showPopover?.();
  const selectedDate = parseDate(source.value) || parseDate(source.max) || parseDate(hongKong().date);
  activeControl = {
    source,
    trigger,
    popup,
    type,
    month: new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), 1))
  };
  renderActiveControl();
  trigger.setAttribute('aria-expanded', 'true');
  trigger.classList.add('is-open');
  requestAnimationFrame(() => {
    if (!activeControl || activeControl.popup !== popup) return;
    popup.classList.add('is-open');
    const selected = popup.querySelector('.is-selected:not([disabled])') || popup.querySelector('button:not([disabled])');
    selected?.focus({ preventScroll: true });
  });
}

function commitValue(value) {
  if (!activeControl) return;
  const { source, trigger } = activeControl;
  source.value = value;
  syncTrigger(source, trigger);
  closeControl({ focus: true });
  source.dispatchEvent(new Event('input', { bubbles: true }));
  source.dispatchEvent(new Event('change', { bubbles: true }));
}

function stepFocusedOption(direction) {
  if (!activeControl) return;
  const selector = activeControl.type === 'date' ? '.calendar-day:not([disabled])' : '.control-option:not([disabled])';
  const buttons = [...activeControl.popup.querySelectorAll(selector)];
  if (!buttons.length) return;
  const current = buttons.indexOf(document.activeElement);
  const next = current < 0 ? 0 : Math.min(Math.max(current + direction, 0), buttons.length - 1);
  buttons[next].focus({ preventScroll: true });
}

function positionSegmented(segmented) {
  const indicator = segmented.querySelector(':scope > .segment-indicator');
  const selected = segmented.querySelector(':scope > button.selected');
  if (!indicator || !selected) {
    indicator?.classList.remove('is-visible');
    return;
  }
  segmented.style.setProperty('--segment-x', `${selected.offsetLeft}px`);
  segmented.style.setProperty('--segment-y', `${selected.offsetTop}px`);
  segmented.style.setProperty('--segment-width', `${selected.offsetWidth}px`);
  segmented.style.setProperty('--segment-height', `${selected.offsetHeight}px`);
  indicator.classList.add('is-visible');
  requestAnimationFrame(() => indicator.classList.add('is-ready'));
}

function installEvents() {
  if (eventsInstalled) return;
  eventsInstalled = true;
  document.addEventListener('click', event => {
    const trigger = event.target.closest('.control-trigger');
    if (trigger) {
      event.preventDefault();
      const source = document.querySelector(`[data-control-id="${CSS.escape(trigger.dataset.controlFor)}"]`);
      if (source && !source.disabled) openControl(source, trigger);
      return;
    }
    const option = event.target.closest('[data-control-option]');
    if (option && activeControl?.type === 'select') {
      event.preventDefault();
      commitValue(activeControl.source.options[Number(option.dataset.controlOption)]?.value ?? '');
      return;
    }
    const date = event.target.closest('[data-calendar-date]');
    if (date && activeControl?.type === 'date') {
      event.preventDefault();
      commitValue(date.dataset.calendarDate);
      return;
    }
    const nav = event.target.closest('[data-calendar-nav]');
    if (nav && activeControl?.type === 'date') {
      event.preventDefault();
      activeControl.month = shiftMonth(activeControl.month, Number(nav.dataset.calendarNav));
      renderActiveControl();
      if (!motionReduced()) activeControl.popup.querySelector('.calendar-grid').animate([
        { opacity: .35, transform: document.documentElement.dataset.motion === 'gentle' ? 'none' : `translateX(${Number(nav.dataset.calendarNav) * 8}px)` },
        { opacity: 1, transform: 'none' }
      ], { duration: 180, easing: 'cubic-bezier(.22,.8,.25,1)' });
      activeControl.popup.querySelector(`[data-calendar-nav="${nav.dataset.calendarNav}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (event.target.closest('[data-calendar-today]') && activeControl?.type === 'date') {
      event.preventDefault();
      commitValue(hongKong().date);
      return;
    }
    if (activeControl && !event.target.closest('.control-popover')) closeControl();
  });
  document.addEventListener('keydown', event => {
    const trigger = event.target.closest('.control-trigger');
    if (trigger && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      const source = document.querySelector(`[data-control-id="${CSS.escape(trigger.dataset.controlFor)}"]`);
      if (source) openControl(source, trigger);
      return;
    }
    if (!activeControl) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeControl({ focus: true });
    } else if (event.key === 'Tab') {
      closeControl({ focus: true });
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      stepFocusedOption(event.key === 'Home' ? -1000 : 1000);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      stepFocusedOption(activeControl.type === 'date' && event.key === 'ArrowDown' ? 7 : 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      stepFocusedOption(activeControl.type === 'date' && event.key === 'ArrowUp' ? -7 : -1);
    }
  });
  document.addEventListener('focusin', event => {
    const source = event.target.closest?.('.native-control-source');
    if (!source) return;
    const trigger = document.querySelector(`[data-control-for="${CSS.escape(source.dataset.controlId)}"]`);
    trigger?.focus({ preventScroll: true });
  });
  window.addEventListener('resize', () => {
    positionPopover();
    document.querySelectorAll('.segmented').forEach(positionSegmented);
  });
  window.addEventListener('scroll', event => {
    if (activeControl && !activeControl.popup.contains(event.target)) positionPopover();
  }, true);
}

function enhanceSegmented(root) {
  const groups = [];
  if (root.matches?.('.segmented')) groups.push(root);
  groups.push(...root.querySelectorAll?.('.segmented') || []);
  groups.forEach(segmented => {
    let indicator = segmented.querySelector(':scope > .segment-indicator');
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'segment-indicator';
      indicator.dataset.persistentUi = '';
      indicator.setAttribute('aria-hidden', 'true');
      segmented.prepend(indicator);
    }
    positionSegmented(segmented);
  });
}

export function enhanceControls(root = document) {
  installEvents();
  if (activeControl && !activeControl.source.isConnected) closeControl({ immediate: true });
  const sources = [];
  if (root.matches?.('select, input[type="date"]')) sources.push(root);
  sources.push(...root.querySelectorAll?.('select, input[type="date"]') || []);
  sources.forEach((source, index) => {
    const id = stableControlId(source, index);
    source.dataset.controlId = id;
    source.classList.add('native-control-source');
    source.tabIndex = -1;
    source.setAttribute('aria-hidden', 'true');
    let trigger = source.parentElement?.querySelector(`:scope > [data-control-for="${CSS.escape(id)}"]`);
    if (!trigger) {
      trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'control-trigger';
      trigger.dataset.controlFor = id;
      trigger.dataset.persistentUi = '';
      trigger.setAttribute('aria-haspopup', source.tagName === 'SELECT' ? 'listbox' : 'dialog');
      trigger.setAttribute('aria-expanded', 'false');
      source.insertAdjacentElement('afterend', trigger);
    }
    trigger.disabled = source.disabled;
    syncTrigger(source, trigger);
  });
  root.querySelectorAll('.control-trigger').forEach(trigger => {
    if (!trigger.parentElement.querySelector(`:scope > [data-control-id="${CSS.escape(trigger.dataset.controlFor)}"]`)) trigger.remove();
  });
  enhanceSegmented(root);
}

export function closeControlLayer(options) {
  closeControl(options);
}
