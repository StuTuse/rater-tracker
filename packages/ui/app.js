import { DIMENSIONS, LABELS, TIERS, SCALE, xp, hongKong, addDays, daysBetween, taskPlan, transact, totalUnits, levelAt, stats, nextCoefficient, progressDays, allocatedProgress, estimate } from './core.js';
import { openStore, ConflictError, validateState, backupText, parseBackup } from './storage.js';
import { currentAccount, loginAccount, logoutAccount, registerAccount, verifyRegistration, cloudSync } from './account.js';
import { SyncEngine } from './sync.js';
import { icon } from './icons.js';
import { BADGES } from './badges.js';
import { ART, badgeArt } from './art.js';
import { updateDOM } from './dom.js';
import { closeControlLayer, enhanceControls } from './controls.js';
import { createModalController } from './modal.js';
import { growthStage, paintStage, stageUpgradeFrames } from './growth-stages.js';
import { chooseLaunchLine, BadgeNoticeQueue } from './notices.js';
import { createPageMotion } from './page-motion.js';
import { finishStartup } from './startup.js';

const platform = window.desktop ?? window.raterNative;
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
const fmt = value => Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const today = () => hongKong().date;
const uid = () => crypto.randomUUID();
let lastLaunchLine;
try { lastLaunchLine = localStorage.getItem('rater-last-launch-line'); } catch {}
const launchLine = chooseLaunchLine(lastLaunchLine);
try { localStorage.setItem('rater-last-launch-line', launchLine); } catch {}
const badgeNotices = new BadgeNoticeQueue();
let badgeNoticeTimer, activeBadge, awardPage = 0;
let account = null, syncEngine = null, syncStatus = '未登录', accountBusy = false;
let accountMode = 'login', registrationChallenge = null;
function accountIdentity() {
  return `<button type="button" class="account-entry" data-action="account-open" aria-label="${account ? '打开账号中心' : '登录或注册账号'}" aria-haspopup="dialog"><span class="account-avatar" aria-hidden="true">${icon('account')}</span><span class="account-entry-text"><strong>${escape(account?.name ?? '未登录')}</strong><span>${account ? '密码 · ••••••••' : '登录 / 注册'}</span></span>${icon('chevron')}</button>`;
}
function refreshAccountIdentity() {
  if ($('#account-entry-slot')) updateDOM($('#account-entry-slot'), accountIdentity());
  if ($('#modal').dataset.kind === 'account' && $('#sync-status')) $('#sync-status').textContent = syncStatus;
}
function openAccountDialog(mode) {
  accountMode = account ? 'profile' : mode ?? 'login';
  let contents;
  if (account) {
    contents = `${modalHead('', '账号中心')}<div class="account-profile"><span class="account-avatar" aria-hidden="true">${icon('account')}</span><div><strong>${escape(account.name)}</strong><span>密码 · ••••••••</span></div></div><p id="sync-status" class="account-sync-status" role="status">${escape(syncStatus)}</p><div class="account-tools">${button('sync-now', '立即同步', 'check', '', 'primary')}${button('sync-adopt', '复制未登录记录', '', '', 'secondary')}${button('sync-download', '备份本机并使用云端', '', '', 'secondary')}${button('account-logout', '退出账号', '', '', 'text-button')}</div><p class="field-hint">断网时继续保存到本机；两端同时修改会保留冲突。密码仅显示掩码。</p>`;
  } else {
    const registering = accountMode === 'register', verifying = accountMode === 'verify';
    const tabs = `<div class="segmented account-tabs" role="group" aria-label="账号操作">${button('account-login-tab', '登录', '', `aria-pressed="${!registering && !verifying}"`, !registering && !verifying ? 'selected' : '')}${button('account-register-tab', '注册账号', '', `aria-pressed="${registering || verifying}"`, registering || verifying ? 'selected' : '')}</div>`;
    const fields = registering => `<label class="field">账号<input name="username" autocomplete="username" placeholder="输入账号" required minlength="${registering ? 6 : 5}" maxlength="25" ${registering ? 'pattern="[A-Za-z][0-9A-Za-z_\\-]{5,24}"' : ''}></label>${registering ? '<p class="field-hint account-username-hint">6～25 位字母、数字、_ 或 -，以字母开头；登录不区分大小写。</p><label class="field">邮箱<input name="email" type="email" autocomplete="email" placeholder="用于接收注册验证码" required maxlength="254"></label>' : '<p class="field-hint account-username-hint">登录不区分大小写。</p>'}<label class="field">密码<input name="password" type="password" autocomplete="${registering ? 'new-password' : 'current-password'}" placeholder="${registering ? '8～32 位密码' : '输入密码'}" required ${registering ? 'minlength="8" maxlength="32"' : 'maxlength="128"'}></label>${registering ? '<label class="field">确认密码<input name="confirmation" type="password" autocomplete="new-password" placeholder="再次输入密码" required minlength="8" maxlength="32"></label>' : ''}`;
    const credentialForm = registering => `<form id="account-${registering ? 'register' : 'login'}">${fields(registering)}<p class="account-form-error" role="alert"></p><button class="primary account-submit" type="submit">${registering ? '发送验证码' : '登录'}</button></form>`;
    const pane = (mode, body) => `<section class="account-pane" data-ui-key="account-pane:${mode}" ${accountMode !== mode ? 'hidden' : ''}>${body}</section>`;
    contents = `${modalHead('', verifying ? '验证邮箱' : registering ? '创建账号' : '欢迎回来')}${tabs}<div class="account-dialog-intro"><span class="account-avatar" aria-hidden="true">${icon('account')}</span><p>${verifying ? '完成邮箱验证，即可开始同步。' : registering ? '创建账号，让成长记录随你同行。' : '登录账号，继续你的成长手记。'}</p></div><div class="account-panes">${pane('login', credentialForm(false))}${pane('register', credentialForm(true))}${pane('verify', `<p class="field-hint">验证码已发送至 ${escape(registrationChallenge?.email)}。</p><form id="account-verify"><label class="field">邮箱验证码<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{4,8}" required maxlength="8" placeholder="输入邮箱中的验证码"></label><p class="account-form-error" role="alert"></p><button class="primary account-submit" type="submit">验证并登录</button></form>${button('account-register-edit', '重新填写 / 发送验证码', '', '', 'text-button account-back')}`)}</div><p class="account-privacy field-hint">${registering || verifying ? '验证成功后创建账号并登录；已有邮箱可能直接登录已有账号。' : '使用应用账号登录。忘记密码可在 CloudBase 控制台重置。'} 密码不会保存到成长记录或显示为明文。</p>`;
  }
  contents += account ? `<div class="account-session-clear">${button('account-clear-data', '清空本机账号数据', '', '', 'text-button')}<p class="field-hint">先备份再退出并清空当前账号的本机副本；云端记录保留。</p></div>` : accountMode !== 'verify' ? button('account-clear-input', '清空输入', '', '', 'text-button account-back') : '';
  openModal(contents, 'account');
  if (!account) $('#modal .account-pane:not([hidden]) input')?.focus({ preventScroll: true });
}
async function openAccount(next) {
  await syncEngine?.running;
  await queue;
  syncEngine = null;
  resetBadgeNotices();
  store.close(); account = next;
  store = await openStore(next?.id); state = validateState(await store.read());
  localStorage.setItem('rater-active-account', JSON.stringify(next));
  drafts.clear(); stopGrowthFeedback(); applyMotion(); growthStatic(); renderContent(false); refreshTaskDialog(); refreshAccountIdentity();
  if (next) {
    const activeStore = store;
    syncEngine = new SyncEngine(store, cloudSync, async (status, message) => {
      if (store !== activeStore) return;
      syncStatus = ({ synced: '已同步', pending: '已保存到本机，待同步', conflict: '两端数据有冲突，请先备份并选择云端版本', offline: '已保存到本机，同步暂未完成' })[status];
      if (message) syncStatus += `：${message}`;
      refreshAccountIdentity();
      await queue;
      if (store !== activeStore) return;
      const latest = validateState(await store.read());
      if (latest.revision !== state.revision) { resetBadgeNotices(); state = latest; applyMotion(); growthStatic(); renderContent(); refreshTaskDialog(); }
      else if (page === 'settings') renderContent();
      $('#save-status').textContent = syncStatus;
    });
    syncStatus = '正在同步'; syncEngine.run();
  } else syncStatus = '未登录 · 仅保存在本机';
}
const button = (action, label, name = '', extra = '', cls = '') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${name ? icon(name) : ''}${label}</button>`;
let store, state, desktopInfo, page = 'today', chosenDate = today(), month = today().slice(0, 7), taskFilter = 'active', taskQuery = '', badgeFilter = 'all', trendRange = 7, rewardTab = 'badges';
let queue = Promise.resolve(), animationToken = 0, numberFrame, celebrationTimer;
const modalUI = createModalController($('#modal'), motionMode, kind => {
  if (kind === 'account') {
    $('#modal').querySelectorAll('input[type="password"], #account-verify input').forEach(input => { input.value = ''; });
    registrationChallenge = null;
  }
  if (kind === 'award') { badgeNotices.dismiss(); activeBadge = null; }
  scheduleBadgeNotice();
});
const growthAnimations = new Set();
const pageMotion = createPageMotion(() => $('#content'), motionMode);
const starAnimations = new Map();
const drafts = new Map();
const seriesNames = { stars: '星光', study: '求知', work: '创作', health: '活力', life: '日常', tasks: '达成' };
const seriesCount = s => ({ ...s, stars: s.stars });
const validTasks = () => Object.values(state.tasks).filter(t => !t.deleted);
const earned = s => BADGES.filter(b => seriesCount(stats(s))[b.series] >= b.threshold);
const dateLabel = date => new Date(`${date}T00:00:00+08:00`).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Hong_Kong' });
const due = task => { const d = daysBetween(today(), task.deadline); return d < 0 ? `逾期 ${-d} 天` : d === 0 ? '今天到期' : d <= 3 ? `${d} 天内到期` : `${task.deadline.slice(5).replace('-', '/')} 截止`; };
const taskStatus = task => task.completion?.active ? '已完成' : task.archived ? '已归档' : task.progress.some(p => p.active) ? '进行中' : '待开始';

function toast(message, error = false) {
  $('#feedback').innerHTML = `<div class="toast ${error ? 'error' : ''}">${icon(error ? 'info' : 'check')}<span>${escape(message)}</span></div>`;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#feedback').replaceChildren(), error ? 8500 : 4200);
}
function motionMode() { return state.settings.motion === 'off' ? 'off' : matchMedia('(prefers-reduced-motion: reduce)').matches ? 'gentle' : state.settings.motion; }
function flowState() {
  const growth = $('#growth');
  if (growth) growth.dataset.flow = motionMode() === 'full' && !document.hidden && totalUnits(state) > 0 ? 'running' : 'paused';
}
function applyMotion() { document.documentElement.dataset.motion = motionMode(); if (motionMode() !== 'full') { pageMotion.cancel(); starAnimations.forEach(a => a.cancel()); starAnimations.clear(); } flowState(); }
function stopGrowthFeedback() {
  ++animationToken;
  cancelAnimationFrame(numberFrame); clearTimeout(celebrationTimer);
  growthAnimations.forEach(animation => animation.cancel()); growthAnimations.clear();
  $('#particles')?.replaceChildren();
  $('#growth')?.classList.remove('level-up', 'level-down', 'xp-changing');
}
function animateGrowth(element, frames, options) {
  const animation = element.animate(frames, options);
  growthAnimations.add(animation);
  animation.finished.then(() => growthAnimations.delete(animation), () => growthAnimations.delete(animation));
  return animation;
}
function paintGrowth() {
  const l = levelAt(totalUnits(state));
  paintStage($('#growth'), l.level);
  $('#level-label').textContent = l.level === 'MAX' ? 'MAX' : `Lv.${l.level}`;
  $('#xp-total').textContent = fmt(l.total);
  $('#xp-progress').textContent = l.level === 'MAX' ? '已达 MAX' : `${fmt(l.current)} / ${l.need} XP`;
  $('#xp-next').textContent = l.level === 'MAX' ? '累计经验继续记录' : `距下一级 ${fmt(l.need - l.current)} XP`;
  $('#xp-fill').style.width = `${l.ratio * 100}%`;
  $('#xp-bar').setAttribute('aria-valuenow', String(Math.round(l.ratio * 100)));
  $('#xp-bar').setAttribute('aria-valuetext', l.level === 'MAX' ? `MAX，累计 ${fmt(l.total)} XP` : `Lv.${l.level}，本级 ${fmt(l.current)} / ${l.need} XP`);
  $('#growth').classList.toggle('max', l.level === 'MAX');
  flowState();
}
function growthStatic() {
  stopGrowthFeedback(); paintGrowth();
  $('#growth-message').textContent = '';
  $('#growth-message').className = 'xp-message';
}
function feedback(before, after, reason) {
  const old = levelAt(totalUnits(before)), next = levelAt(totalUnits(after));
  const delta = next.total - old.total;
  const gained = earned(after).filter(b => !earned(before).some(e => e.id === b.id));
  const lost = earned(before).filter(b => !earned(after).some(e => e.id === b.id));
  if (delta === 0 && !gained.length && !lost.length) {
    if (before.settings.motion !== after.settings.motion) growthStatic();
    return;
  }
  // Capture the rendered position before cancelling an interrupted transition.
  const fill = $('#xp-fill'), track = $('#xp-bar');
  const displayedRatio = Math.max(0, Math.min(1, parseFloat(getComputedStyle(fill).width) / track.clientWidth));
  const displayedTotal = Number($('#xp-total').textContent.replaceAll(',', ''));
  stopGrowthFeedback();
  const token = animationToken;
  paintGrowth();
  const changed = old.level !== next.level;
  const phrase = changed ? (next.level === 'MAX' ? '抵达 MAX' : `${delta > 0 ? '升级至' : '更正为'} Lv.${next.level}${typeof old.level === 'number' && typeof next.level === 'number' && Math.abs(next.level - old.level) > 1 ? ` · 跨越 ${Math.abs(next.level - old.level)} 级` : ''}`) : reason;
  $('#growth-message').textContent = `${delta >= 0 ? '+' : '−'}${fmt(Math.abs(delta))} XP · ${phrase}`;
  $('#growth-message').className = delta < 0 ? 'xp-message negative' : 'xp-message';
  badgeNotices.add(gained.map(b => b.id));
  reconcileBadgeNotices();
  if (lost.length) toast(`${lost.length} 枚徽章因有效记录变化撤回`);
  if (motionMode() !== 'off') {
    const mode = motionMode(), duration = mode === 'gentle' ? 300 : changed ? 1280 : 820;
    const final = `${next.ratio * 100}%`, initial = `${displayedRatio * 100}%`;
    const keyframes = changed && mode === 'full' ? [{ width: initial, offset: 0 }, { width: delta > 0 ? '100%' : '0%', offset: .34 }, { width: delta > 0 ? '0%' : '100%', offset: .36 }, { width: final, offset: 1 }] : [{ width: initial }, { width: final }];
    animateGrowth(fill, keyframes, { duration, easing: 'cubic-bezier(.22,.8,.25,1)' });
    animateGrowth($('#xp-ghost'), [{ width: initial, opacity: delta < 0 ? .38 : 0 }, { width: initial, opacity: 0 }], { duration: duration + 180 });
    $('#growth').classList.add('xp-changing');
    $('#growth').dataset.direction = delta < 0 ? 'decrease' : 'increase';
    if (mode === 'full') animateGrowth($('.xp-tip'), [{ opacity: .4, transform:'scale(.8)' }, { opacity: 1, transform:'scale(1.12)', offset:.45 }, { opacity:.65, transform:'scale(1)' }], { duration:duration+160, easing:'ease-out' });
    const start = performance.now();
    const tick = time => { if (token !== animationToken) return; const p = Math.min(1, (time - start) / duration); $('#xp-total').textContent = fmt(displayedTotal + (next.total - displayedTotal) * (1 - (1 - p) ** 3)); if (p < 1) numberFrame = requestAnimationFrame(tick); else { paintGrowth(); $('#growth').classList.remove('xp-changing'); } };
    numberFrame = requestAnimationFrame(tick);
    if (changed) {
      $('#growth').classList.add(delta > 0 ? 'level-up' : 'level-down');
      const stage = growthStage(next.level);
      if (delta > 0) {
        animateGrowth($('#level-art'), mode === 'full' ? stageUpgradeFrames(stage, next.level === 'MAX') : [{ opacity:.65 }, { opacity:1 }], { duration:mode === 'full' ? stage.upgrade + (next.level === 'MAX' ? 200 : 0) : 180, easing:'cubic-bezier(.22,.8,.25,1)' });
      }
      if (delta > 0 && mode === 'full') for (let i = 0; i < (next.level === 'MAX' ? 32 : 5 + stage.id * 2); i++) { const particle = document.createElement('i'); particle.style.setProperty('--angle', `${i * 137.5}deg`); particle.style.setProperty('--distance', `${35 + stage.id * 6 + (i % 4) * 14}px`); particle.style.setProperty('--delay', `${(i % 3) * 35}ms`); $('#particles').append(particle); }
    }
    celebrationTimer = setTimeout(() => { if (token === animationToken) { $('#particles').replaceChildren(); $('#growth').classList.remove('level-up', 'level-down'); $('#growth-message').textContent = ''; } }, 2000);
  } else $('#growth').classList.remove('xp-changing');
}

function save(action, reason) {
  const prepared = { ...action, id: action.id ?? uid() };
  queue = queue.then(async () => {
    const before = state;
    try {
      const next = transact(state, prepared);
      if (next === state) return;
      await store.write(next, before.revision);
      state = next; applyMotion(); renderContent(true, true); refreshTaskDialog(); feedback(before, state, reason);
      $('#save-status').textContent = '已保存到本机';
      if (syncEngine) { syncStatus = '已保存到本机，待同步'; syncEngine.run(); }
    } catch (error) {
      if (error instanceof ConflictError) { resetBadgeNotices(); state = validateState(await store.read()); renderContent(); growthStatic(); }
      $('#save-status').textContent = '本次未保存'; toast(error.message, true);
      throw error;
    }
  }).catch(() => {});
  return queue;
}

function shell() {
  $('#app').innerHTML = `<aside class="sidebar">
    <a class="brand" href="#today" data-action="navigate" data-page="today" aria-label="返回今日"><img src="assets/app.svg" alt=""><span>Rater <i>&</i> Tracker</span></a>
    <div class="nav-caption">记录</div>
    <nav>${[['today', '今日', 'sun'], ['tasks', '任务', 'tasks'], ['history', '历史', 'history'], ['rewards', '奖励中心', 'rewards'], ['settings', '设置', 'settings']].map(([id, title, i]) => button('navigate', title, i, `data-page="${id}"`, `nav-link ${page === id ? 'selected' : ''}`)).join('')}</nav>
    <div class="sidebar-bottom"><div id="account-entry-slot">${accountIdentity()}</div><small>v${escape(desktopInfo.version)}</small></div>
  </aside><div class="workspace"><header class="topbar"><div class="top-intro"><div class="top-kicker">Rater & Tracker</div><span id="launch-line" title="${escape(launchLine)}">${escape(launchLine)}</span></div><span id="save-status">已保存到本机</span></header>
    <section id="growth" class="growth"><div class="level-medallion"><div id="level-art"></div><strong id="level-label"></strong><div id="particles"></div></div><div class="growth-body"><div class="growth-head"><span class="eyebrow">等级经验</span><span class="xp-message" id="growth-message"></span></div><div class="xp-bar" id="xp-bar" role="progressbar" aria-label="当前等级经验进度" aria-valuemin="0" aria-valuemax="100"><div id="xp-ghost"></div><div id="xp-fill"><div class="xp-fluid" aria-hidden="true"><i></i><i></i><i></i></div><div class="xp-stage-stream" aria-hidden="true">${Array.from({length:6},(_,i)=>`<i style="--mote:${i}"></i>`).join('')}</div><div class="xp-glint" aria-hidden="true"></div><div class="xp-tip" aria-hidden="true"></div></div></div><div class="growth-foot"><span id="xp-progress"></span><span id="xp-next"></span></div></div><div class="total-xp"><span>有效累计经验</span><strong id="xp-total"></strong><small>XP</small></div></section>
    <main id="content"></main><footer>Rater & Tracker <span>·</span> 本机保存</footer></div>`;
  growthStatic();
}
function header(kicker, title, description, right = '') { return `<div class="page-header"><div><h1>${title}</h1>${description ? `<p class="subtitle">${description}</p>` : ''}</div>${right}</div>`; }
function datePicker() { return `<div class="date-switch">${button('previous-date', '‹', '', 'aria-label="前一天"')}<input aria-label="评分日期" type="date" id="rating-date" value="${chosenDate}" max="${today()}">${button('next-date', '›', '', `aria-label="后一天" ${chosenDate === today() ? 'disabled' : ''}`)}</div>`; }
function ratingCards(date) {
  const day = state.ratings[date] ?? {};
  return `<div class="ratings-grid">${DIMENSIONS.map((d, i) => {
    const r = day[d], amount = r ? state.ledger.filter(e => e.owner === `${date}/${d}` && e.active).reduce((sum, e) => sum + e.actual, 0) : 0;
    const note = drafts.get(`${date}/${d}`) ?? r?.note ?? '';
    return `<article data-ui-key="rating:${date}/${d}" class="rating-card ${r ? 'rated' : ''}" style="--order:${i}"><div class="card-top"><div class="category-icon ${d}">${icon(d)}</div><div><h2>${LABELS[d]}</h2></div><span class="rating-state">${r ? `${r.stars} 星` : '未评分'}</span></div>
      <div class="rating-control" role="group" aria-label="${LABELS[d]}评分"><button class="zero ${r?.stars === 0 ? 'active' : ''}" type="button" data-action="rate" data-dimension="${d}" data-stars="0" aria-pressed="${r?.stars === 0}">0 星</button><div class="stars">${[1, 2, 3, 4, 5].map(star => `<button type="button" data-action="rate" data-dimension="${d}" data-stars="${star}" class="star-button ${r && r.stars >= star ? 'lit' : ''}" aria-label="${LABELS[d]} ${star} 星" aria-pressed="${r?.stars === star}">${icon('star')}</button>`).join('')}</div></div>
      <div class="rating-meta"><span>${r ? `${icon('check')}已记录 · ${fmt(xp(amount))} XP` : '未记录'}</span>${r ? button('clear-rating', '清空', '', `data-dimension="${d}"`, 'text-button') : '<span class="normal-xp">5–15 XP</span>'}</div>
      <details ${note ? 'open' : ''}><summary>${icon('work')}原因与依据 <span>选填</span></summary><textarea rows="2" class="rating-note" data-dimension="${d}" data-date="${date}" placeholder="备注（选填）" ${r ? '' : 'disabled'} aria-label="${LABELS[d]}原因与依据">${escape(note)}</textarea><small class="field-hint">自动保存 · <button type="button" class="text-button reference" data-action="reference" data-dimension="${d}">查看评分参照</button></small></details></article>`;
  }).join('')}</div>`;
}
function empty(title, description, action = '', art = 'task') { return `<div class="empty"><div class="empty-art"><img src="${ART[art]}" alt="" width="140" height="140"></div><h3>${title}</h3><p>${description}</p>${action}</div>`; }
function taskCard(t, compact = false) {
  const p = t.frozen ?? taskPlan(t), tier = TIERS.find(x => x.id === p.tier);
  const done = t.stages.filter(s => s.done).length;
  const consumed = allocatedProgress(state, t), amount = state.ledger.filter(e => e.owner === t.id && e.active).reduce((a, e) => a + e.actual, 0);
  const caution = !t.completion?.active && !t.archived && daysBetween(today(), t.deadline) <= 3;
  return `<article data-ui-key="task:${t.id}" class="task-card ${compact ? 'compact' : ''}"><div class="task-heading"><div class="task-marker ${t.completion?.active ? 'done' : ''}">${icon(t.completion?.active ? 'check' : 'flag')}</div><div class="task-title"><button type="button" class="title-button" data-action="task-detail" data-task="${t.id}">${escape(t.title)}</button><div class="task-tags"><span>${tier.name}</span>${t.dimension ? `<span>${LABELS[t.dimension]}</span>` : ''}<span class="${caution ? 'due' : ''}">${t.completion?.active ? `${t.completion.date} 完成` : due(t)}</span></div></div><span class="status ${t.completion?.active ? 'green' : ''}">${taskStatus(t)}</span></div>
    ${!compact && t.goal ? `<p class="task-goal">${escape(t.goal)}</p>` : ''}<div class="task-progress"><div class="thin-bar"><i style="width:${Math.min(100, consumed / (p.e * .5) * 100)}%"></i></div><small>推进额度 ${fmt(xp(consumed))} / ${fmt(xp(p.e * .5))} XP ${t.stages.length ? ` · 阶段 ${done}/${t.stages.length}` : ''}</small></div>
    <div class="task-foot"><span>已得 <b>${fmt(xp(amount))}</b> XP</span><div>${!t.completion?.active && !t.archived ? `${button('quick-progress', '推进', 'path', `data-task="${t.id}"`, 'secondary small')}${button('quick-complete', '完成', 'check', `data-task="${t.id}"`, 'primary small')}` : button('task-detail', '查看记录', 'arrow', `data-task="${t.id}"`, 'text-button')}</div></div></article>`;
}
function todayPage() {
  const day = state.ratings[chosenDate] ?? {}, count = DIMENSIONS.filter(d => day[d]).length;
  const tasks = validTasks().filter(t => !t.archived && !t.hidden && !t.completion?.active).sort((a, b) => a.deadline.localeCompare(b.deadline));
  const s = stats(state);
  return header(chosenDate === today() ? 'TODAY / 今日手记' : 'DAILY JOURNAL / 每日手记', chosenDate === today() ? '今日评分' : dateLabel(chosenDate), `${dateLabel(chosenDate)} · ${count === 4 ? '四项已全部记录' : `已记录 ${count} / 4 项`}`, datePicker()) + `<div class="today-layout"><section><div class="section-title"><h2>每日评分</h2><span>${count === 4 ? `${icon('check')}今日记录完成` : '空白 ≠ 0 星'}</span></div>${ratingCards(chosenDate)}<div class="gentle-note">${icon('info')}0 星计入记录，未评分不计入。${chosenDate !== today() ? '<br>历史增量按补记时间折扣；原有经验保持。' : ''}</div></section><aside class="today-tasks"><div class="section-title"><h2>待办任务</h2>${button('new-task', '新建', 'plus', '', 'text-button')}</div><div class="task-stack">${tasks.slice(0, 4).map(t => taskCard(t, true)).join('') || empty('暂无任务', '', button('new-task', '新建任务', 'plus', '', 'secondary'))}</div>${tasks.length > 4 ? button('navigate', `查看全部 ${tasks.length} 项任务`, 'arrow', 'data-page="tasks"', 'text-button all-tasks') : ''}<div class="small-reflection"><span class="eyebrow">累计记录</span><div><strong>${s.recorded}</strong><span>记录天数</span><strong>${s.tasks}</strong><span>完成成果</span></div><p>${s.completeDays} 天完整评分 · ${s.stars} 颗有效星星</p></div></aside></div>`;
}
function tasksPage() {
  const list = validTasks().filter(t => taskFilter === 'all' || taskFilter === 'active' && !t.completion?.active && !t.archived || taskFilter === 'completed' && t.completion?.active && !t.hidden || taskFilter === 'archived' && t.archived || taskFilter === 'hidden' && t.hidden).filter(t => `${t.title} ${t.goal}`.toLowerCase().includes(taskQuery.toLowerCase())).sort((a, b) => a.deadline.localeCompare(b.deadline));
  return header('PROJECTS / 成果与推进', '任务', '', button('new-task', '新建任务', 'plus', '', 'primary')) + `<div class="toolbar"><div class="segmented">${[['active', '未完成'], ['completed', '已完成'], ['archived', '归档'], ['hidden', '已隐藏'], ['all', '全部']].map(([id, label]) => button('task-filter', label, '', `data-filter="${id}"`, taskFilter === id ? 'selected' : '')).join('')}</div><input id="task-search" type="search" placeholder="搜索名称或完成标准" aria-label="搜索任务" value="${escape(taskQuery)}"></div><div class="tasks-grid">${list.map(t => taskCard(t)).join('')}</div>${list.length ? '' : empty('暂无任务', '', button('new-task', '新建任务', 'plus', '', 'secondary'))}`;
}
function calendar() {
  const first = `${month}-01`, offset = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const [year, mon] = month.split('-').map(Number), length = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return `<section class="panel calendar-panel"><div class="calendar-head">${button('previous-month', '‹', '', 'aria-label="上个月"')}<h2>${year} 年 ${mon} 月</h2>${button('next-month', '›', '', 'aria-label="下个月"')}</div><div class="calendar-grid">${['一', '二', '三', '四', '五', '六', '日'].map(d => `<span class="weekday">${d}</span>`).join('')}${'<span></span>'.repeat(offset)}${Array.from({ length }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`, count = DIMENSIONS.filter(d => state.ratings[date]?.[d]).length;
    return `<button type="button" data-action="calendar-date" data-date="${date}" class="calendar-day ${chosenDate === date ? 'selected' : ''} ${count === 4 ? 'full' : ''} ${date === today() ? 'today' : ''}" ${date > today() ? 'disabled' : ''} aria-label="${date}，${count} 项评分"><span>${i + 1}</span><i class="${count ? 'has-record' : ''}"></i></button>`;
  }).join('')}</div><p class="field-hint">● 有记录 <span class="green-dot">●</span> 四项完整 · 空白日期未评分</p></section>`;
}
function trend() {
  const start = addDays(chosenDate, -(trendRange - 1)), width = 640, height = 160, pad = 22;
  const dates = Array.from({ length: trendRange }, (_, i) => addDays(start, i));
  const colors = ['#c79825', '#cf9866', '#88a26b', '#658b80'];
  let graph = [0, 1, 2, 3, 4, 5].map(n => `<line x1="${pad}" x2="${width - pad}" y1="${height - pad - n * 23}" y2="${height - pad - n * 23}" stroke="#e8e4d8"/><text x="4" y="${height - pad - n * 23 + 4}" fill="#888272" font-size="10">${n}</text>`).join('');
  DIMENSIONS.forEach((d, index) => {
    let path = '', pen = false, circles = '';
    dates.forEach((date, i) => {
      const r = state.ratings[date]?.[d];
      if (!r) { pen = false; return; }
      const x = pad + i * (width - 2 * pad) / (dates.length - 1), y = height - pad - r.stars * 23;
      path += `${pen ? 'L' : 'M'}${x},${y} `; pen = true;
      circles += `<circle cx="${x}" cy="${y}" r="3" fill="${colors[index]}"><title>${date} ${LABELS[d]} ${r.stars} 星</title></circle>`;
    });
    graph += `<path class="trend-line" d="${path}" fill="none" stroke="${colors[index]}" stroke-width="2.4" stroke-linecap="round"/>${circles}`;
  });
  const recorded = dates.filter(date => DIMENSIONS.some(d => state.ratings[date]?.[d])).length, full = dates.filter(date => DIMENSIONS.every(d => state.ratings[date]?.[d])).length;
  return `<section class="panel trend-panel"><div class="section-title"><h2>评分趋势</h2><div class="segmented">${[7, 30].map(n => button('trend-range', `${n} 天`, '', `data-range="${n}"`, trendRange === n ? 'selected' : '')).join('')}</div></div><div class="legend">${DIMENSIONS.map((d, i) => `<span style="--legend:${colors[i]}">${LABELS[d]}</span>`).join('')}</div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${trendRange} 天评分趋势，未评分日期保留断点">${graph}</svg><div class="trend-labels"><span>${start}</span><span>${chosenDate}</span></div><p class="field-hint">${recorded} 天有记录 · ${full} 天四项完整 · 未评分不计为 0 星</p></section>`;
}
function historyPage() {
  const events = state.ledger.filter(e => e.date === chosenDate && !e.owner.includes('/')).sort((a, b) => b.sequence - a.sequence);
  return header('MEMORIES / 历史与回顾', '历史记录', '', datePicker()) + `<div class="history-overview">${calendar()}${trend()}</div><div class="section-title"><h2>${chosenDate} · 每日评分</h2><span>直接选择星数即可补记或更正</span></div>${ratingCards(chosenDate)}<section class="panel history-events"><div class="section-title"><h2>当天任务事件</h2><span>${events.length} 笔结算</span></div>${events.length ? ledgerTable(events) : '<p class="muted">这一天没有任务事件。</p>'}</section>`;
}
function ledgerTable(entries) {
  return `<div class="table-scroll"><table><thead><tr><th>事件 / 来源</th><th>实际日期</th><th>正常额度</th><th>折扣</th><th>实际入账</th><th>状态</th></tr></thead><tbody>${entries.map(e => `<tr><td><strong>${escape(e.kind)}</strong><small>${escape(e.owner.includes('/') ? `${e.date} ${LABELS[e.owner.split('/')[1]]}` : state.tasks[e.owner]?.title ?? e.owner)}</small></td><td>${e.date}<small>录入 ${hongKong(e.recordedAt).date}</small></td><td>${fmt(xp(e.normal))}</td><td>${(e.factor.numerator / e.factor.denominator * 100).toFixed(1)}%<small>${e.factor.delay ? `延迟 ${e.factor.delay} 天` : '及时'}</small></td><td class="${e.active ? '' : 'cancelled'}">${fmt(xp(e.actual))} XP</td><td>${e.active ? '<span class="green-text">有效</span>' : '<span class="muted">已撤回</span>'}</td></tr>`).join('')}</tbody></table></div>`;
}
function coefficientCards(date = today(), previous = false) {
  return `<div class="coefficient-grid">${TIERS.map(t => {
    const next = nextCoefficient(state, t.id, date), prevDate = addDays(next.start, -1), prev = nextCoefficient(state, t.id, prevDate);
    const entries = state.ledger.filter(e => e.active && e.window === prev.key), prevTasks = validTasks().filter(task => task.completion?.active && task.completion.window === prev.key);
    return `<article class="coefficient-card"><span class="eyebrow">${t.name} · ${t.id === 'short' ? '自然月' : t.id === 'medium' ? '固定双月' : t.id === 'long' ? '自然季度' : '固定半年'}</span><strong>×${(next.c / 100).toFixed(2)}</strong><p>本期 ${next.count} 次有效完成 · 上限 ${(t.cap / 100).toFixed(2)}</p><small>${next.start} — ${addDays(next.end, -1)}<br>${next.end} 重置 · 还有 ${daysBetween(today(), next.end)} 天</small>${previous ? `<div class="previous-period">上期 ${prevTasks.length} 份成果 · ${fmt(xp(entries.reduce((sum, e) => sum + e.actual, 0)))} XP 完成基础入账</div>` : ''}</article>`;
  }).join('')}</div>`;
}
function badgeCards() {
  const counts = stats(state);
  return `<div class="badge-grid">${BADGES.filter(b => badgeFilter === 'all' || b.series === badgeFilter).map(b => {
    const count = counts[b.series], unlocked = count >= b.threshold;
    return `<button type="button" class="badge-card ${unlocked ? 'earned' : 'locked'}" data-action="badge-detail" data-badge="${b.id}"><img src="${badgeArt(b.id)}" alt="${escape(b.subject)}"><h3>${b.name}</h3><span>${seriesNames[b.series]} · 第 ${b.tier} 级</span><div class="thin-bar"><i style="width:${Math.min(100, count / b.threshold * 100)}%"></i></div><small>${unlocked ? `${icon('check')}已获得` : `${count.toLocaleString()} / ${b.threshold.toLocaleString()}${b.series === 'tasks' ? ' 次' : ' 星'}`}</small></button>`;
  }).join('')}</div>`;
}
function periodReview() {
  const current = nextCoefficient(state, 'short', today()), end = addDays(current.start, -1), start = nextCoefficient(state, 'short', end).start;
  const days = Object.entries(state.ratings).filter(([date]) => date >= start && date <= end).map(([, day]) => day);
  const recorded = days.filter(day => DIMENSIONS.some(d => day[d])).length, full = days.filter(day => DIMENSIONS.every(d => day[d])).length;
  const stars = days.reduce((sum, day) => sum + DIMENSIONS.reduce((n, d) => n + (day[d]?.stars ?? 0), 0), 0);
  const sources = [['评分', e => e.owner.includes('/')], ['创建', e => e.kind === '创建任务'], ['推进', e => e.kind === '推进任务'], ['完成', e => e.kind === '完成任务'], ['持续奖励', e => e.kind.startsWith('持续奖励')]];
  const entries = state.ledger.filter(e => e.active && e.date >= start && e.date <= end);
  return `<section class="panel"><h2>上一个自然月 · ${start} — ${end}</h2><p class="subtitle">${recorded} 天有记录 · ${full} 天四项完整 · ${stars} 颗有效星星</p><div class="review-sources">${sources.map(([label, match]) => `<div><span>${label}</span><strong>${fmt(xp(entries.filter(match).reduce((sum, e) => sum + e.actual, 0)))}</strong><small>XP</small></div>`).join('')}</div><h2>各量级的上一个窗口</h2><p class="subtitle">以现存有效完成为依据，历史取消不再贡献统计。</p>${coefficientCards(today(), true)}${trend()}</section>`;
}
function rules() {
  return `<section class="panel rules"><h2>奖励规则</h2><details open><summary>每日评分</summary><p>四项固定为学习、作品、健康、生活；空白与 0 星不同。每项正常经验 = 5 + 2 × 星数。四项满星共 60 XP，没有额外全项完成奖。香港时间次日 04:00 前，前一天评分仍按及时记录。</p></details><details><summary>任务额度、推进与完成</summary><p>D = 原目标日期 − 开始日期，同日按 1 天。Dr = min(D,365)；E = [30 + 5 × (Dr − 1)] × M × 1.3；常规 / 重要 / 核心 M 为 1 / 1.5 / 2。创建的 2 XP 包含在 E 内。首次推进或直接完成时冻结原计划与重要性，延期不增加 E。</p><p>短 / 中 / 长 / 超长的每次推进比例为 10% / 5% / 2.5% / 1%，总提前领取最多 50% E。P = min(完成日前有效推进日数 × 2%,20%)；同日多条仅计一个持续日，完成当日不计。T = E × (1+P) × C；完成扣除正常创建与已分配推进额度，不补回打折损失。</p><p>C = 1 + min(本窗口此前有效同量级完成数 × 步长, 上限 − 1)。四档步长为 .05 / .08 / .10 / .15，上限为 1.30 / 1.40 / 1.50 / 1.60；窗口为自然月 / 固定双月 / 季度 / 半年。以保存成功顺序计数，历史完成冻结 C。</p></details><details><summary>补记、更正、撤销与删除</summary><p>任务按自然日；延迟 d≥1：F = 0.5 / [1 + 0.1 × (d−1)]。实际经验 = 正常分配 × F。历史增星只对新增星数打折；減星优先撤回最近批次的实际所得。文字修改不改奖，经验不会自动随时间减少。</p><p>删除历史推进或已完成任务的推进，撤回其实际所得，保留取消的正常额度痕迹；P 减少时撤回最近持续份额。完成后补录历史成果只可补持续奖励，不再预付；每份补发使用原 C 和本次补记 F。撤销完成一并撤回持续奖励，其他任务 C 不变。同日恢复同一完成日期沿用原 C 和仍满足条件的原奖励；跨日重新完成按新日期结算。</p><p>归档与恢复不发奖；隐藏已完成仅整理列表；删除任务撤回全部有效所得。备份恢复不重新结算。</p></details><details><summary>等级与徽章</summary><p>从 Lv.L 升到下一阶段需 30 + 5 × (L−1) XP。Lv.99 需累计 26,705 XP，MAX 为 27,225 XP。有效经验下降同步重算等级。六组共 48 枚独立徽章，以有效星数与完成任务数为依据，不额外发 XP；高级保留低级，记录更正会撤回不再满足的徽章。</p></details><details><summary>一个 14 天重要任务</summary><p>E=185.25。完成前四天各推进一次，预付共 37.05，创建 2，P=8%，第一个中任务 C=1；正常总奖励 200.07，完成结算 161.02。第二个同窗口中任务 C=1.08，总奖励 216.0756；所有预估以实际结算为准。</p></details><p class="field-hint">规则 v1.3 · 金额以整数百万分之一 XP 保存；每筆分配四舍五入一次，界面通常显示一位小数。</p></section>`;
}
function rewardsPage() {
  const s = stats(state), obtained = earned(state);
  return header('GROWTH / 奖励中心', '奖励中心', '') + `<div class="summary-grid"><div><span>收集的徽章</span><strong>${obtained.length}<small> / 48</small></strong></div><div><span>有效星数</span><strong>${s.stars.toLocaleString()}</strong></div><div><span>完成的成果</span><strong>${s.tasks}</strong></div><div><span>完整记录天数</span><strong>${s.completeDays}</strong></div></div><div class="section-title"><h2>下一份成果的完成系数</h2><span>各量级独立 · 以实际结算为准</span></div>${coefficientCards()}<div class="toolbar reward-tabs"><div class="segmented">${[['badges', '徽章收藏'], ['ledger', '经验明细'], ['review', '周期回顾'], ['rules', '奖励规则']].map(([id, label]) => button('reward-tab', label, '', `data-tab="${id}"`, rewardTab === id ? 'selected' : '')).join('')}</div></div>${rewardTab === 'badges' ? `<div class="badge-filters">${[['all', '全部'], ...Object.entries(seriesNames)].map(([id, label]) => button('badge-filter', label, '', `data-series="${id}"`, badgeFilter === id ? 'chip selected' : 'chip')).join('')}</div>${badgeCards()}` : rewardTab === 'ledger' ? `<section class="panel"><p class="field-hint">共 ${state.ledger.length} 笔 · 显示最近 200 笔；完整历史随 JSON 备份保留。</p>${state.ledger.length ? ledgerTable([...state.ledger].reverse().slice(0, 200)) : empty('暂无经验明细', '保存评分或记录任务后，在这里查看明细。', '', 'ledger')}</section>` : rewardTab === 'rules' ? rules() : periodReview()}`;
}
function settingsPage() {
  return header('YOUR SPACE / 设置', '设置', '') + `<div class="settings-layout"><section class="panel"><h2>${icon('study')}评分参照</h2><p class="subtitle">自定义各项评分标准。</p><form id="references-form">${DIMENSIONS.map(d => `<label class="field">${LABELS[d]}<textarea name="${d}" rows="3" maxlength="4000">${escape(state.settings.references[d])}</textarea></label>`).join('')}<button class="primary" type="submit">${icon('check')}保存评分参照</button></form></section><div><section class="panel"><h2>${icon('sun')}动效与反馈</h2><label class="field">动效强度<select id="motion-setting"><option value="full" ${state.settings.motion === 'full' ? 'selected' : ''}>完整 · 金色成长反馈</option><option value="gentle" ${state.settings.motion === 'gentle' ? 'selected' : ''}>柔和 · 轻量过渡</option><option value="off" ${state.settings.motion === 'off' ? 'selected' : ''}>关闭 · 保留数值反馈</option></select></label><p class="field-hint">系统开启减少动态时，自动使用柔和动效。</p></section><section class="panel backup-panel"><h2>${icon('backup')}完整备份与恢复</h2><p>备份包括评分批次、任务、冻结参数、结算与取消历史及设置。恢复会完整替换当前数据。</p><div class="backup-actions">${button('export', '导出 JSON 备份', 'backup', '', 'primary')}${button('import', '从备份恢复', 'restore', '', 'secondary')}</div><p class="field-hint">最近导出：${state.settings.lastExport ? new Date(state.settings.lastExport).toLocaleString('zh-CN', { timeZone: 'Asia/Hong_Kong' }) : '还没有导出过'}${!state.settings.lastExport || daysBetween(hongKong(state.settings.lastExport).date, today()) >= 7 ? '<br><span class="amber-text">建议每周备份。</span>' : ''}</p></section><section class="panel data-panel"><h2>${icon('archive')}本机数据</h2><p class="data-path">${escape(desktopInfo.dataDirectory)}</p>${window.desktop ? button('open-data', '打开数据目录', 'arrow', '', 'text-button') : ''}<dl><dt>产品版本</dt><dd>${escape(desktopInfo.version)}</dd><dt>规则 / 备份格式</dt><dd>v1.3 / 1</dd><dt>已保存事务</dt><dd>${state.revision}</dd><dt>有效评分天数 / 任务</dt><dd>${stats(state).recorded} / ${validTasks().length}</dd></dl><p class="field-hint">更新保留数据。应用关闭后不发送提醒。</p></section></div></div>`;
}
function renderContent(preserveInputs = true, animateChanges = false, entrance = '') {
  if (entrance) pageMotion.cancel();
  const referenceDraft = preserveInputs && $('#references-form') ? Object.fromEntries(new FormData($('#references-form'))) : null;
  const focus = document.activeElement;
  const focusId = focus?.id, start = focus?.selectionStart, end = focus?.selectionEnd;
  document.querySelectorAll('.nav-link').forEach(el => { el.classList.toggle('selected', el.dataset.page === page); el.setAttribute('aria-current', el.dataset.page === page ? 'page' : 'false'); });
  const content = $('#content');
  if (!animateChanges) {
    starAnimations.forEach(a => a.cancel()); starAnimations.clear();
    content.classList.add('static-update');
  }
  updateDOM(content, ({ today: todayPage, tasks: tasksPage, history: historyPage, rewards: rewardsPage, settings: settingsPage })[page](), { preserveInputs, starChanged: animateChanges ? animateStar : () => {} });
  enhanceControls(content);
  if (!animateChanges) {
    const star = content.querySelector('.star-button .icon');
    if (star) getComputedStyle(star).fill;
    content.classList.remove('static-update');
  }
  if (referenceDraft && $('#references-form')) for (const [name, value] of Object.entries(referenceDraft)) $('#references-form').elements.namedItem(name).value = value;
  if (focusId && document.getElementById(focusId)) { const next = document.getElementById(focusId); next.focus({ preventScroll: true }); try { next.setSelectionRange(start, end); } catch {} }
  // Notes retain focus and selection even when another committed transaction refreshes cards.
  if (focus?.classList.contains('rating-note')) {
    const next = document.querySelector(`.rating-note[data-dimension="${focus.dataset.dimension}"][data-date="${focus.dataset.date}"]`);
    if (next) { next.focus({ preventScroll: true }); next.setSelectionRange(start, end); }
  }
  if (entrance) pageMotion.play(entrance);
}
function animateStar(button, lit) {
  const svg = button.querySelector('svg'), previous = starAnimations.get(svg);
  const transform = previous ? getComputedStyle(svg).transform : lit ? 'scale(.72) rotate(-9deg)' : 'scale(1.08)';
  previous?.cancel(); starAnimations.delete(svg);
  if (motionMode() === 'off' || document.hidden) return;
  const gentle = motionMode() === 'gentle';
  const animation = svg.animate(gentle ? [{ opacity: .55 }, { opacity: 1 }] : [
    { transform, opacity: .65 },
    { transform: lit ? 'scale(1.14) rotate(3deg)' : 'scale(.94)', opacity: 1, offset: .58 },
    { transform: 'scale(1) rotate(0deg)', opacity: 1 }
  ], { duration: gentle ? 150 : lit ? 360 : 240, delay: gentle ? 0 : lit ? (Number(button.dataset.stars) - 1) * 24 : 0, easing: 'cubic-bezier(.22,.8,.25,1)' });
  starAnimations.set(svg, animation);
  const finished = () => { if (starAnimations.get(svg) === animation) starAnimations.delete(svg); };
  animation.finished.then(finished, finished);
}
function previewRating(control, stars) {
  if (stars === null) delete control.dataset.preview;
  else control.dataset.preview = String(stars);
  control.querySelectorAll('.star-button').forEach(b => {
    b.classList.toggle('preview-lit', stars !== null && Number(b.dataset.stars) <= stars);
    b.classList.toggle('preview-dim', stars !== null && Number(b.dataset.stars) > stars);
  });
}
document.addEventListener('pointerover', event => {
  if (event.pointerType === 'touch') return;
  const button = event.target.closest('[data-action="rate"]');
  if (button) previewRating(button.closest('.rating-control'), Number(button.dataset.stars));
});
document.addEventListener('pointerout', event => {
  const control = event.target.closest('.rating-control');
  if (control && !control.contains(event.relatedTarget)) previewRating(control, null);
});
document.addEventListener('focusin', event => {
  const button = event.target.closest('[data-action="rate"]');
  if (button && button.matches(':focus-visible')) previewRating(button.closest('.rating-control'), Number(button.dataset.stars));
});
document.addEventListener('focusout', event => {
  const control = event.target.closest('.rating-control');
  if (control && !control.contains(event.relatedTarget)) previewRating(control, null);
});
function openModal(contents, kind = '') {
  if (kind !== 'award' && $('#modal').dataset.kind === 'award') { badgeNotices.dismiss(); activeBadge = null; }
  modalUI.open(contents, kind);
}
function closeModal() { modalUI.close(); }
function resetBadgeNotices() {
  clearTimeout(badgeNoticeTimer); badgeNotices.clear();
  if ($('#modal').open && $('#modal').dataset.kind === 'award') closeModal();
}
function scheduleBadgeNotice() {
  clearTimeout(badgeNoticeTimer);
  if (!badgeNotices.pending.length) return;
  badgeNoticeTimer = setTimeout(() => {
    const modal = $('#modal'), focus = document.activeElement;
    if (modal.open || modal.hasAttribute('data-closing') || document.hidden || focus?.matches('input,textarea,select,[contenteditable=true]')) return;
    badgeNotices.reconcile(earned(state).map(b => b.id));
    if (!badgeNotices.take().length) return;
    awardPage = 0; showBadgeNotice();
  }, 180);
}
function reconcileBadgeNotices() {
  badgeNotices.reconcile(earned(state).map(b => b.id));
  if ($('#modal').open && $('#modal').dataset.kind === 'award') {
    if (!badgeNotices.current.length) closeModal();
    else if (!badgeNotices.current.includes(activeBadge)) { awardPage = 0; showBadgeNotice(); }
    else { awardPage = badgeNotices.current.indexOf(activeBadge); $('#award-count').textContent = `${awardPage + 1} / ${badgeNotices.current.length}`; }
  }
  scheduleBadgeNotice();
}
function showBadgeNotice() {
  const ids = badgeNotices.current;
  if (!ids.length) return;
  awardPage = Math.min(awardPage, ids.length - 1);
  const badge = BADGES.find(b => b.id === ids[awardPage]); activeBadge = badge.id;
  const confetti = motionMode() === 'full' ? `<div class="award-confetti" aria-hidden="true">${Array.from({length:36},(_,i)=>`<i style="--piece:${i};--x:${(i * 37) % 100}%;--drift:${(i % 2 ? 1 : -1) * (20 + i % 6 * 8)}px;--delay:${i % 9 * 35}ms;--spin:${i % 2 ? 250 : -220}deg"></i>`).join('')}</div>` : '';
  openModal(`<div class="award-heading"><span>获得勋章</span>${button('close-modal', '', 'close', 'aria-label="关闭"', 'icon-button')}</div>${confetti}<div class="award-body"><div class="award-halo" aria-hidden="true"></div><img class="award-image" src="${badgeArt(badge.id)}" alt="${escape(badge.subject)}"><h2 id="modal-title">${escape(badge.name)}</h2><p>${seriesNames[badge.series]} · 第 ${badge.tier} 级</p></div><div class="award-actions">${ids.length > 1 ? `${button('award-prev', '上一枚', 'chevron', '', 'secondary')}<span id="award-count">${awardPage + 1} / ${ids.length}</span>${button('award-next', '下一枚', 'chevron', '', 'secondary')}` : '<span id="award-count" hidden>1 / 1</span>'}${button('close-modal', '收下', '', '', 'primary')}</div>`, 'award');
}
document.addEventListener('focusout', scheduleBadgeNotice);
document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleBadgeNotice(); else $('.award-confetti')?.remove(); });
const modalHead = (kicker, title) => `<div class="modal-head"><div><h2 id="modal-title">${escape(title)}</h2></div>${button('close-modal', '', 'close', 'aria-label="关闭"', 'icon-button')}</div>`;
function confirmAction(title, body, callback, label = '确认', danger = false) {
  openModal(`${modalHead('请核对这次操作', title)}<p class="confirm-body">${body}</p><div class="modal-actions">${button('close-modal', '取消', '', '', 'secondary')}<button type="button" id="confirm-action" class="${danger ? 'danger' : 'primary'}">${label}</button></div>`, 'confirm');
  $('#confirm-action').onclick = () => { closeModal(); callback(); };
}
function newTask() {
  openModal(`${modalHead('NEW PROJECT', '新建任务')}<form id="task-form"><label class="field">任务名称 <span>必填</span><input name="title" placeholder="例如：完成我的第一支视频" required maxlength="160" autofocus></label><label class="field">成果 / 完成标准<textarea name="goal" placeholder="交付什么，做到什么程度？" rows="2" maxlength="4000"></textarea></label><div class="form-row"><label class="field">计划开始日期<input type="date" name="start" value="${today()}" required></label><label class="field">原目标日期<input type="date" name="target" value="${addDays(today(), 7)}" required></label></div><div class="form-row"><label class="field">所属项目<select name="dimension"><option value="">不分类</option>${DIMENSIONS.map(d => `<option value="${d}">${LABELS[d]}</option>`).join('')}</select></label><label class="field">重要性<select name="importance"><option value="normal">常规 · ×1</option><option value="important">重要 · ×1.5</option><option value="core">核心 · ×2</option></select></label></div><label class="field">阶段清单 <span>选填，每行一个</span><textarea name="stages" rows="3" placeholder="准备素材\n完成初稿\n最终交付"></textarea></label><p id="plan-preview" class="plan-preview"></p><p class="field-hint">首次推进或直接完成时冻结原计划与重要性。阶段勾选不单独发奖。</p><div class="modal-actions">${button('close-modal', '取消', '', '', 'secondary')}<button class="primary" type="submit">${icon('plus')}创建任务 · +2 XP</button></div></form>`, 'new');
  updatePlanPreview();
}
function updatePlanPreview() {
  const form = $('#task-form'); if (!form) return;
  try { const plan = taskPlan(Object.fromEntries(new FormData(form))); $('#plan-preview').textContent = `${plan.days} 天 · ${TIERS.find(t => t.id === plan.tier).name} · 原始额度 ${fmt(xp(plan.e))} XP`; } catch(error) { $('#plan-preview').textContent = error.message; }
}
function detailContents(t) {
  const plan = t.frozen ?? taskPlan(t), completed = t.completion?.active;
  const previewDate = completed ? t.completion.date : t.deadline < today() ? today() : t.deadline;
  const est = estimate(state, t, previewDate);
  const activeXP = state.ledger.filter(e => e.owner === t.id && e.active).reduce((a, e) => a + e.actual, 0), cancelledQuota = t.progress.filter(p => !p.active && p.retained).reduce((sum, p) => sum + state.ledger.find(e => e.id === p.entry).normal, 0);
  return `${modalHead('PROJECT JOURNAL', t.title)}<div class="detail-status"><span class="status ${completed ? 'green' : ''}">${taskStatus(t)}</span><span>${plan.days} 天 · ${TIERS.find(x => x.id === plan.tier).name} · ${plan.importance === 'core' ? '核心' : plan.importance === 'important' ? '重要' : '常规'}</span></div><p class="detail-goal">${escape(t.goal || '未填写完成标准')}</p><div class="detail-numbers"><div><span>原始额度 E</span><b>${fmt(xp(plan.e))}</b></div><div><span>实际已得 XP</span><b>${fmt(xp(activeXP))}</b></div><div><span>有效持续日</span><b>${Math.min(10, progressDays(t, previewDate))}<small> / 10</small></b></div></div><p class="field-hint">${t.frozen ? '原计划、额度与重要性已锁定' : '尚未推进，原计划仍可修改'} · ${t.start} → ${t.target}<br>推进正常额度已分配 ${fmt(xp(allocatedProgress(state, t)))} / ${fmt(xp(plan.e * .5))} XP${cancelledQuota ? `<br>其中 ${fmt(xp(cancelledQuota))} XP 额度因删除已撤回，保留痕迹，不返流完成奖。` : ''}</p>
    ${completed ? `<div class="settlement">${icon('check')} ${t.completion.date} 完成 · 冻结 C=${(t.completion.c / 100).toFixed(2)}<p>${escape(t.completion.note || '这份成果已经交付。')}</p></div>` : `<div class="plan-preview">假设 ${previewDate} 完成，当前已知持续日 P=${est.p}%，目标窗口下一次 C=${(est.c / 100).toFixed(2)}；正常完成分配预估 ${fmt(xp(est.allocation))} XP。<small>未来推进与完成计数尚不确定，补记折扣另计，以实际结算为准。</small></div>`}
    ${t.stages.length ? `<section class="detail-section"><h3>阶段清单 <span>独立于经验分配</span></h3>${t.stages.map(s => `<label class="stage-row"><input type="checkbox" data-stage="${s.id}" data-task="${t.id}" ${s.done ? 'checked' : ''}>${escape(s.name)}</label>`).join('')}</section>` : ''}
    ${!t.archived && (!completed || t.completion.date > t.start) ? `<section class="detail-section"><h3>${completed ? '补录完成日前的真实成果' : '记录一次推进'}</h3><form id="progress-form" data-task="${t.id}"><div class="form-row"><label class="field">实际推进日期<input type="date" name="date" value="${completed ? addDays(t.completion.date, -1) : today()}" min="${t.start}" max="${completed ? addDays(t.completion.date, -1) : today()}" required></label><label class="field">成果说明<input name="note" required maxlength="4000" placeholder="这一次具体完成了什么？"></label></div><button type="submit" class="secondary">${icon('path')}${completed ? '补录历史推进' : '保存推进'}</button></form><p class="field-hint">${completed ? '补录不重新预付；新增有效持续日才补发相应折扣增量。' : '同日不同成果可多次记录；同一成果只记一次。'}</p></section>` : ''}
    ${!completed && !t.archived ? `<section class="detail-section"><h3>最终交付</h3><form id="complete-form" data-task="${t.id}"><div class="form-row"><label class="field">实际完成日期<input type="date" name="date" value="${today()}" min="${t.start}" max="${today()}" required></label><label class="field">完成说明<input name="note" placeholder="记录这份最终成果" maxlength="4000"></label></div><button type="submit" class="primary">${icon('check')}完成并结算</button>${t.completion?.undoneOn === today() ? button('restore-completion', `恢复原 ${t.completion.date} 完成记录`, 'restore', `data-task="${t.id}"`, 'text-button') : ''}</form></section>` : ''}
    <section class="detail-section"><h3>推进历史</h3>${t.progress.length ? t.progress.map(p => `<div class="progress-entry ${p.active ? '' : 'cancelled'}"><div><span>${p.date} ${p.active ? '' : '· 已删除'}</span><p>${escape(p.note)}</p><small>实际 ${fmt(xp(state.ledger.find(e => e.id === p.entry).actual))} XP${p.active ? '' : ' 已撤回'}</small></div>${p.active ? button('delete-progress', '删除', 'delete', `data-task="${t.id}" data-progress="${p.id}"`, 'text-button') : ''}</div>`).join('') : '<p class="muted">还没有推进记录。</p>'}</section>
    <details class="detail-section"><summary>修改任务信息 / 延期</summary><form id="edit-task-form" data-task="${t.id}"><label class="field">任务名称<input name="title" value="${escape(t.title)}" required maxlength="160"></label><label class="field">成果标准<textarea name="goal" rows="2">${escape(t.goal)}</textarea></label><label class="field">当前截止日期<input type="date" name="deadline" value="${t.deadline}" min="${t.start}" required></label>${!t.frozen ? `<div class="form-row"><label class="field">原计划开始<input name="start" type="date" value="${t.start}" required></label><label class="field">原目标日期<input name="target" type="date" value="${t.target}" required></label></div><label class="field">重要性<select name="importance">${[['normal', '常规'], ['important', '重要'], ['core', '核心']].map(([id, title]) => `<option value="${id}" ${t.importance === id ? 'selected' : ''}>${title}</option>`).join('')}</select></label>` : ''}<button class="secondary" type="submit">保存修改</button></form></details>
    <div class="detail-actions">${completed ? `${button('undo-complete', '撤销完成', 'history', `data-task="${t.id}"`, 'secondary')}${button(t.hidden ? 'restore-task' : 'hide-task', t.hidden ? '取消隐藏' : '隐藏已完成', 'archive', `data-task="${t.id}"`, 'secondary')}` : button(t.archived ? 'restore-task' : 'archive-task', t.archived ? '恢复任务' : '放弃并归档', 'archive', `data-task="${t.id}"`, 'secondary')}${button('delete-task', '删除整个任务', 'delete', `data-task="${t.id}"`, 'danger-text')}</div>`;
}
function taskDetail(id) { const task = state.tasks[id]; if (!task || task.deleted) return; openModal(detailContents(task), 'task'); $('#modal').dataset.task = id; }
function refreshTaskDialog() {
  const modal = $('#modal'); if (!modal.open || modal.dataset.kind !== 'task') return;
  closeControlLayer({ immediate: true });
  const t = state.tasks[modal.dataset.task]; if (!t || t.deleted) { closeModal(); return; }
  const scroll = modal.scrollTop, values = [...modal.querySelectorAll('form')].map(f => [f.id, Object.fromEntries(new FormData(f))]);
  const focus = document.activeElement, name = focus?.name, formId = focus?.form?.id;
  updateDOM(modal, detailContents(t));
  for (const [id, fields] of values) for (const [name, value] of Object.entries(fields)) { const field = document.getElementById(id)?.elements.namedItem(name); if (field && !(field.type === 'date' && (field.min && value < field.min || field.max && value > field.max))) field.value = value; }
  enhanceControls(modal);
  modal.scrollTop = scroll;
  if (name && formId) document.getElementById(formId)?.elements.namedItem(name)?.focus({ preventScroll: true });
}
async function exportBackup(recordExport = true) {
  await queue;
  const contents = backupText(state), name = `Rater-Tracker-${today()}-backup.json`;
  let exported;
  if (platform) exported = await platform.exportBackup(contents, name);
  else { const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); exported = true; }
  if (exported) { if (recordExport) await save({ type: 'settings', lastExport: true }, '备份已导出'); toast('完整备份已导出，冻结参数与取消历史一并保存。'); }
  return exported;
}
async function importBackup() {
  let contents;
  if (platform) contents = await platform.importBackup();
  else {
    contents = await new Promise(resolve => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json'; input.onchange = async () => resolve(input.files[0] ? await input.files[0].text() : null); input.oncancel = () => resolve(null); input.click(); });
  }
  if (!contents) return;
  const restored = parseBackup(contents), dates = Object.keys(restored.ratings).filter(date => Object.keys(restored.ratings[date]).length).sort(), taskCount = Object.values(restored.tasks).filter(t => !t.deleted).length;
  confirmAction('从这份完整备份恢复？', `备份中有 <b>${dates.length}</b> 天评分、<b>${taskCount}</b> 个任务、<b>${restored.ledger.length}</b> 笔结算，有效经验 <b>${fmt(xp(totalUnits(restored)))} XP</b>。<br>评分日期范围：${dates.length ? `${dates[0]} — ${dates.at(-1)}` : '无评分'}。<br><br>先导出当前数据的备份，成功后才替换全部数据。`, async () => {
    try {
      if (!await exportBackup()) { toast('当前数据备份未导出，恢复尚未执行。'); return; }
      await queue;
      const replacement = structuredClone(restored); replacement.revision = state.revision + 1;
      await store.write(replacement, state.revision); state = replacement; drafts.clear();
      stopGrowthFeedback(); resetBadgeNotices();
      applyMotion(); growthStatic(); renderContent(false); toast('完整恢复成功。历史奖励保持原值。');
    } catch (error) { toast(error.message, true); }
  }, '备份当前数据并恢复');
}

document.addEventListener('click', async event => {
  const b = event.target.closest('[data-action]'); if (!b || b.disabled || accountBusy) return;
  const action = b.dataset.action, taskId = b.dataset.task;
  try {
    if (action === 'account-open') { openAccountDialog(); return; }
    if (action === 'account-login-tab') { openAccountDialog('login'); return; }
    if (action === 'account-register-tab') { openAccountDialog(registrationChallenge ? 'verify' : 'register'); return; }
    if (action === 'account-register-edit') { openAccountDialog('register'); return; }
    if (action === 'account-clear-input') { const pane = $('#modal .account-pane:not([hidden])'); pane?.querySelector('form')?.reset(); if (pane) pane.querySelector('[role="alert"]').textContent = ''; pane?.querySelector('input')?.focus({ preventScroll: true }); return; }
    if (action === 'account-clear-data') {
      confirmAction('清空本机账号数据？', '先导出当前完整备份，再退出并删除此账号的本机记录及同步缓存。未同步改动只保存在备份中；云端、未登录记录和其他账号不受影响。重新登录可下载云端记录。', async () => {
        const activeAccount = account, activeStore = store, previousEngine = syncEngine;
        let cleared = false, signedOut = false;
        accountBusy = true;
        try {
          await previousEngine?.running; await queue; syncEngine = null;
          state = validateState(await activeStore.read()); const expectedRevision = state.revision;
          if (!await exportBackup(false)) { openAccountDialog(); return; }
          await queue; await logoutAccount(); signedOut = true; await activeStore.clearAccount(expectedRevision); await openAccount(null);
          localStorage.removeItem('rater-active-account'); registrationChallenge = null;
          cleared = true; openAccountDialog('login'); toast('本机账号数据已清空，云端记录保留。');
        } catch (error) { if (signedOut) { await openAccount(null); openAccountDialog('login'); } toast(error.message, true); }
        finally { if (!cleared && account?.id === activeAccount?.id) syncEngine = previousEngine; accountBusy = false; }
      }, '备份并清空'); return;
    }
    if (action === 'sync-now') { syncStatus = '正在同步'; refreshAccountIdentity(); await queue; await syncEngine?.run(); return; }
    if (action === 'account-logout') {
      accountBusy = true;
      try { await syncEngine?.running; await queue; await logoutAccount(); await openAccount(null); renderContent(false); openAccountDialog('login'); }
      finally { accountBusy = false; }
      return;
    }
    if (action === 'sync-download') {
      confirmAction('使用云端版本？', '先导出本机完整备份，再使用云端数据。本机未同步改动保留在备份中。', async () => {
        await syncEngine?.running;
        if (!await exportBackup()) return;
        await queue;
        const expected = state.revision, result = await cloudSync({ type: 'pull' });
        if (!result.state) { toast('云端还没有记录。', true); return; }
        await store.useCloud(validateState(result.state), result.version, expected);
        state = validateState(await store.read()); drafts.clear(); growthStatic(); renderContent(false); syncEngine.run();
      }, '备份并使用云端'); return;
    }
    if (action === 'sync-adopt') {
      confirmAction('复制未登录时的本机记录？', '先备份当前账号数据，再完整复制未登录记录。联网后按版本检查上传，有冲突时不会覆盖云端。', async () => {
        await syncEngine?.running;
        if (!await exportBackup()) return;
        await queue;
        const guest = await openStore();
        const source = validateState(await guest.read()); guest.close();
        source.revision = state.revision + 1;
        await store.write(source, state.revision); state = source; growthStatic(); renderContent(false); syncEngine.run();
      }, '备份并复制'); return;
    }
    switch (action) {
      case 'navigate': { const changed = page !== b.dataset.page; page = b.dataset.page; renderContent(true, false, changed ? 'page' : ''); break; }
      case 'rate': await save({ type: 'rate', dimension: b.dataset.dimension, stars: Number(b.dataset.stars), date: chosenDate, ...(drafts.has(`${chosenDate}/${b.dataset.dimension}`) ? { note: drafts.get(`${chosenDate}/${b.dataset.dimension}`) } : {}) }, '评分已保存'); break;
      case 'clear-rating': confirmAction(`清空${LABELS[b.dataset.dimension]}评分？`, '这会撤回该项全部实际经验和星数，之后重新补记按新的录入时间结算。', () => { drafts.delete(`${chosenDate}/${b.dataset.dimension}`); save({ type: 'rate', dimension: b.dataset.dimension, stars: null, date: chosenDate }, '评分已清空'); }, '清空评分', true); break;
      case 'reference': openModal(`${modalHead('RATING GUIDE', `${LABELS[b.dataset.dimension]} · 评分参照`)}<p class="reference-text">${escape(state.settings.references[b.dataset.dimension])}</p>${button('close-modal', '知道了', '', '', 'primary')}`, 'reference'); break;
      case 'previous-date': chosenDate = addDays(chosenDate, -1); month = chosenDate.slice(0, 7); renderContent(); break;
      case 'next-date': chosenDate = addDays(chosenDate, 1); month = chosenDate.slice(0, 7); renderContent(); break;
      case 'calendar-date': chosenDate = b.dataset.date; renderContent(); break;
      case 'previous-month': { const d = new Date(`${month}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 1); month = d.toISOString().slice(0, 7); renderContent(); break; }
      case 'next-month': { const d = new Date(`${month}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); month = d.toISOString().slice(0, 7); renderContent(); break; }
      case 'task-filter': { const changed = taskFilter !== b.dataset.filter; taskFilter = b.dataset.filter; renderContent(true, false, changed ? 'tasks' : ''); break; }
      case 'trend-range': { const changed = trendRange !== Number(b.dataset.range); trendRange = Number(b.dataset.range); renderContent(true, false, changed ? 'trend' : ''); break; }
      case 'reward-tab': { const changed = rewardTab !== b.dataset.tab; rewardTab = b.dataset.tab; renderContent(true, false, changed ? 'rewards' : ''); break; }
      case 'badge-filter': { const changed = badgeFilter !== b.dataset.series; badgeFilter = b.dataset.series; renderContent(true, false, changed ? 'badges' : ''); break; }
      case 'new-task': newTask(); break;
      case 'task-detail': taskDetail(taskId); break;
      case 'quick-progress': taskDetail(taskId); $('#progress-form')?.scrollIntoView({ block: 'center' }); $('#progress-form [name="note"]')?.focus(); break;
      case 'quick-complete': taskDetail(taskId); $('#complete-form')?.scrollIntoView({ block: 'center' }); $('#complete-form [name="date"]')?.focus(); break;
      case 'close-modal': closeModal(); break;
      case 'award-prev': awardPage = (awardPage - 1 + badgeNotices.current.length) % badgeNotices.current.length; showBadgeNotice(); break;
      case 'award-next': awardPage = (awardPage + 1) % badgeNotices.current.length; showBadgeNotice(); break;
      case 'delete-progress': confirmAction('删除这条推进？', '撤回该推进实际所得，必要时同步撤回持续奖励。历史或已完成的分配额度保留取消痕迹，不回流到完成奖。', async () => { await save({ type: 'deleteProgress', taskId, progressId: b.dataset.progress }, '推进已删除'); taskDetail(taskId); }, '删除推进', true); break;
      case 'undo-complete': confirmAction('撤销这次完成？', '撤回这次完成及附属持续奖励，保留创建与有效推进所得；其他任务冻结系数保持。', async () => { await save({ type: 'undoComplete', taskId }, '完成已撤销'); taskDetail(taskId); }, '撤销完成'); break;
      case 'restore-completion': await save({ type: 'complete', taskId, date: state.tasks[taskId].completion.date, note: state.tasks[taskId].completion.note }, '原完成记录已恢复'); break;
      case 'archive-task': await save({ type: 'archive', taskId }, '任务已归档'); break;
      case 'restore-task': await save({ type: 'restore', taskId }, '任务已恢复'); break;
      case 'hide-task': await save({ type: 'hide', taskId }, '已完成任务已隐藏'); break;
      case 'delete-task': confirmAction('删除整个任务？', '这会撤回全部有效创建、推进、完成及持续奖励，并回退完成数。这项操作不可恢复；可先导出备份。', () => save({ type: 'deleteTask', taskId }, '任务已删除'), '删除整个任务', true); break;
      case 'badge-detail': { const badge = BADGES.find(item => item.id === b.dataset.badge), count = stats(state)[badge.series]; openModal(`${modalHead(`${seriesNames[badge.series]} / 第 ${badge.tier} 级`, badge.name)}<div class="badge-detail ${count >= badge.threshold ? 'earned' : 'locked'}"><img src="${badgeArt(badge.id)}" alt="${escape(badge.subject)}"><p>${escape(badge.subject)}</p><h3>${count >= badge.threshold ? '已获得' : `还差 ${(badge.threshold - count).toLocaleString()}${badge.series === 'tasks' ? ' 次有效完成' : ' 颗有效星星'}`}</h3><p>当前 ${count.toLocaleString()} / 门槛 ${badge.threshold.toLocaleString()}</p><small>徽章不另发经验；有效记录变化时同步获得或撤回。</small></div>${button('close-modal', '关闭', '', '', 'primary')}`, 'badge'); break; }
      case 'export': await exportBackup(); break;
      case 'import': await importBackup(); break;
      case 'open-data': await window.desktop.openData(); break;
    }
  } catch(error) { toast(error.message, true); }
});
document.addEventListener('input', event => {
  const el = event.target;
  if (el.classList.contains('rating-note')) drafts.set(`${el.dataset.date}/${el.dataset.dimension}`, el.value);
  if (el.id === 'task-search') { taskQuery = el.value; renderContent(); }
  if (el.closest('#task-form')) updatePlanPreview();
});
document.addEventListener('focusout', event => {
  const el = event.target;
  if (el.classList.contains('rating-note') && state.ratings[el.dataset.date]?.[el.dataset.dimension] && el.value !== state.ratings[el.dataset.date][el.dataset.dimension].note) save({ type: 'note', date: el.dataset.date, dimension: el.dataset.dimension, note: el.value }, '原因已保存');
});
document.addEventListener('change', event => {
  const el = event.target;
  if (el.id === 'rating-date') { if (el.value && el.value <= today()) { chosenDate = el.value; month = chosenDate.slice(0, 7); renderContent(); } }
  if (el.id === 'motion-setting') save({ type: 'settings', motion: el.value }, '动效偏好已保存');
  if (el.dataset.stage) save({ type: 'stage', taskId: el.dataset.task, stageId: el.dataset.stage, done: el.checked }, '阶段已更新');
});
document.addEventListener('submit', async event => {
  if (['account-login', 'account-register', 'account-verify'].includes(event.target.id)) {
    event.preventDefault();
    if (accountBusy) return;
    const form = event.target, values = Object.fromEntries(new FormData(form));
    const submit = form.querySelector('button[type="submit"]'), label = submit.textContent;
    accountBusy = true; submit.disabled = true; submit.textContent = '正在处理…'; form.querySelector('[role="alert"]').textContent = '';
    try {
      if (form.id === 'account-register') {
        if (values.password !== values.confirmation) throw new Error('两次输入的密码不一致');
        registrationChallenge = await registerAccount({ username: values.username.trim(), email: values.email.trim(), password: values.password });
        if ($('#modal').open) openAccountDialog('verify');
      } else {
        const next = form.id === 'account-verify' ? await verifyRegistration(registrationChallenge?.id, values.code.trim()) : await loginAccount(values.username.trim(), values.password);
        if (!next?.id) throw new Error('未获得有效账号身份，请重新登录');
        registrationChallenge = null; await openAccount(next);
        if ($('#modal').open && $('#modal').dataset.kind === 'account') openAccountDialog();
      }
    } catch (error) { if (form.isConnected) form.querySelector('[role="alert"]').textContent = error.message; else toast(error.message, true); }
    finally { values.password = ''; values.confirmation = ''; accountBusy = false; if (submit.isConnected) { submit.disabled = false; submit.textContent = label; } }
    return;
  }
  event.preventDefault(); const form = event.target, values = Object.fromEntries(new FormData(form));
  if (form.id === 'task-form') {
    const id = uid();
    await save({ ...values, type: 'createTask', id }, '任务已创建');
    if (state.tasks[id]) { closeModal(); taskDetail(id); }
  } else if (form.id === 'progress-form') {
    const previous = state.revision; await save({ ...values, type: 'progress', taskId: form.dataset.task }, '推进已保存');
    if (state.revision > previous) $('#progress-form [name="note"]').value = '';
  } else if (form.id === 'complete-form') await save({ ...values, type: 'complete', taskId: form.dataset.task }, '成果已完成');
  else if (form.id === 'edit-task-form') await save({ ...values, type: 'editTask', taskId: form.dataset.task }, '任务信息已保存');
  else if (form.id === 'references-form') await save({ type: 'settings', references: values }, '评分参照已保存');
});
$('#modal').addEventListener('cancel', event => { event.preventDefault(); closeModal(); });
$('#modal').addEventListener('click', event => { if (event.target === $('#modal')) { const rect = $('#modal').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal(); } });
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { if (state) { applyMotion(); growthStatic(); } });
document.addEventListener('visibilitychange', () => { if (state) { if (document.hidden) { pageMotion.cancel(); growthStatic(); } else flowState(); } });
window.raterReload = async () => { resetBadgeNotices(); state = validateState(await store.read()); growthStatic(); renderContent(); };
window.raterReady = (async () => {
  try {
    store = await openStore(); state = validateState(await store.read());
    desktopInfo = platform ? await platform.info() : { version: '0.1.0-alpha.17', dataDirectory: '浏览器预览 · 当前来源的 IndexedDB（与桌面数据独立）', packaged: false };
    applyMotion(); shell(); renderContent();
    try {
      const remembered = JSON.parse(localStorage.getItem('rater-active-account') ?? 'null');
      const active = await currentAccount().catch(() => remembered);
      if (active?.id) await openAccount(active);
    } catch (error) { syncStatus = `账号恢复未完成：${error.message}`; }
    setInterval(() => { if (!document.hidden && syncEngine) syncEngine.run(); }, 60000);
    window.addEventListener('online', () => syncEngine?.run());
    setInterval(() => { if (page === 'today' && chosenDate !== today() && !document.hidden && !$('#modal').open) $('#save-status').textContent = '香港日期已更新，可切换到今天'; }, 60000);
  } catch(error) { $('#app').innerHTML = `<div class="boot"><h1>数据尚未打开</h1><p>${escape(error.message)}</p><p>原数据保持；请保留数据目录后重试。</p><button id="retry-startup">重新打开</button></div>`; $('#retry-startup').onclick = () => location.reload(); }
  finally { await finishStartup(state ? motionMode() : (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'gentle' : 'full'), () => { if ($('#content')) pageMotion.play('page'); }); }
})();

window.addEventListener('rater-back', () => { if(document.querySelector('[popover]:popover-open')) { closeControlLayer(); return; } if($('#modal').open) { closeModal(); return; } if(page!=='today') { page='today'; renderContent(true,false,'page'); return; } platform?.quit?.(); });
window.addEventListener('rater-resume', () => { if(store) window.raterReload().then(()=>syncEngine?.run()).catch(e=>toast(e.message)); });
