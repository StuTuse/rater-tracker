// Planning-only scenario calculation; this is not application code.
const fs = require('node:fs');
const path = require('node:path');

const horizon = 1800;
const enhancedTasks = process.argv.includes('--enhanced-tasks');
const tieredProgress = process.argv.includes('--tiered-progress');
if (tieredProgress && !enhancedTasks) throw Error('Use --enhanced-tasks with --tiered-progress');
const taskBoost = enhancedTasks ? 1.3 : 1;
const startDate = Date.UTC(2026, 9, 11);
const taskTiers = [
  {id: 'short', maxDays: 7, months: 1, step: 0.05, cap: 0.30, progressRate: 0.10},
  {id: 'medium', maxDays: 30, months: 2, step: 0.08, cap: 0.40, progressRate: 0.05},
  {id: 'long', maxDays: 90, months: 3, step: 0.10, cap: 0.50, progressRate: 0.025},
  {id: 'extended', maxDays: Infinity, months: 6, step: 0.15, cap: 0.60, progressRate: 0.01}
];
function taskTier(days) { return taskTiers.find(tier => days <= tier.maxDays); }
function cycleKey(day, tier) {
  const date = new Date(startDate + (day - 1) * 86400000);
  const month = date.getUTCFullYear() * 12 + date.getUTCMonth();
  return tier.id + ':' + Math.floor(month / tier.months);
}
const profiles = [
  { id: 'light', label: '轻量记录', weights: [0.05, 0.15, 0.30, 0.30, 0.15, 0.05],
    meanStars: 2.5, timely: 4, late: 7,
    tasks: [{ every: 30, offsets: [1], days: 7, importance: 1, progress: [3] },
            { every: 60, offsets: [1], days: 14, importance: 1.5, progress: [3, 6, 9, 12] }] },
  { id: 'steady', label: '稳定记录', weights: [0.02, 0.06, 0.16, 0.44, 0.30, 0.02],
    meanStars: 3, timely: 6, late: 1,
    tasks: [{ every: 30, offsets: [1, 16], days: 14, importance: 1.5, progress: [3, 6, 9, 12] },
            { every: 30, offsets: [8, 23], days: 7, importance: 1, progress: [3] }] },
  { id: 'active', label: '高投入记录', weights: [0, 0.02, 0.06, 0.18, 0.38, 0.36],
    meanStars: 4, timely: 7, late: 0,
    tasks: [{ every: 30, offsets: [1, 8, 15, 22], days: 14, importance: 1.5, progress: [3, 6, 9, 12] },
            { every: 30, offsets: [1, 8, 15, 22], days: 7, importance: 1, progress: [3] },
            { every: 30, offsets: [1], days: 30, importance: 2, progress: [2, 4, 7, 9, 12, 14, 17, 19, 22, 25] }] }
];

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
function threshold(level) {
  const n = level - 1;
  return 30 * n + 2.5 * n * (n - 1);
}
function levelAt(xp) {
  let level = 1;
  while (level < 100 && xp + 1e-8 >= threshold(level + 1)) level++;
  return level;
}
function decay(days) { return days === 0 ? 1 : 0.5 / (1 + 0.1 * (days - 1)); }
function score(weights, random) {
  let value = random();
  for (let i = 0; i < weights.length; i++) {
    value -= weights[i]; if (value <= 0) return i;
  }
  return 5;
}
function simulate(profile, seed) {
  const random = rng(seed);
  const events = Array.from({length: horizon + 1}, () => []);
  const add = (day, event) => { if (day <= horizon) events[day].push(event); };
  let theoreticalRatingXp = 0;
  let expectedStars = 0;
  for (let day = 1; day <= horizon; day++) {
    const weekday = (day - 1) % 7;
    if (weekday > profile.timely || (profile.timely === 7 && weekday > 6)) continue;
    const isLate = profile.timely < 7 && weekday === profile.timely;
    const delay = isLate ? profile.late : 0;
    const stars = Array.from({length: 4}, () => score(profile.weights, random));
    const normalXp = stars.reduce((sum, star) => sum + 5 + 2 * star, 0);
    theoreticalRatingXp += normalXp;
    expectedStars += stars.reduce((sum, star) => sum + star, 0);
    add(day + delay, {source: 'rating', xp: normalXp * decay(delay), stars, normalXp, delay});
  }
  for (const task of profile.tasks) {
    const allowance = (30 + 5 * (task.days - 1)) * task.importance * taskBoost;
    for (let block = 0; block < horizon; block += task.every) {
      for (const offset of task.offsets) {
        const start = block + offset;
        if (start > horizon) continue;
        add(start, {source: 'task', xp: 2});
        let advances = 0;
        task.progress.forEach(progressDay => {
          const payout = Math.min(allowance * (tieredProgress ? taskTier(task.days).progressRate : 0.1), Math.max(0, allowance * 0.5 - advances));
          advances += payout;
          add(start + progressDay, {source: 'task', xp: payout});
        });
        const bonus = allowance * Math.min(new Set(task.progress.filter(d => d < task.days)).size * 0.02, 0.2);
        const finalXp = allowance - 2 - advances + bonus;
        if (Math.abs(2 + advances + finalXp - allowance - bonus) > 1e-7) throw Error('Task accounting mismatch');
        add(start + task.days, {source: 'task', xp: finalXp, completed: true, allowance, bonus, prepaid: 2 + advances, taskDays: task.days});
      }
    }
  }
  let xp = 0, ratingXp = 0, taskXp = 0, normalXp = 0, taskCount = 0, stars = [0, 0, 0, 0];
  const rows = [{day: 0, xp: 0, level: 1, ratingXp: 0, taskXp: 0, stars: 0, taskCount: 0}];
  const first = {};
  const badgeFirst = {};
  const cycleCounts = new Map();
  for (let day = 1; day <= horizon; day++) {
    for (const event of events[day]) {
      if (enhancedTasks && event.completed) {
        const tier = taskTier(event.taskDays);
        const key = cycleKey(day, tier);
        const previousCompleted = cycleCounts.get(key) || 0;
        const coefficient = 1 + Math.min(tier.step * previousCompleted, tier.cap);
        event.xp = (event.allowance + event.bonus) * coefficient - event.prepaid;
        if (event.xp < 0) throw Error('Negative task settlement');
        cycleCounts.set(key, previousCompleted + 1);
      }
      xp += event.xp;
      if (event.source === 'rating') {
        ratingXp += event.xp;
        normalXp += event.normalXp;
        stars = stars.map((value, i) => value + event.stars[i]);
      } else { taskXp += event.xp; if (event.completed) taskCount++; }
    }
    const totalStars = stars.reduce((sum, value) => sum + value, 0);
    const level = levelAt(xp);
    for (const target of [10, 20, 30, 50, 75, 90, 99, 100]) {
      if (!first[target] && level >= target) first[target] = day;
    }
    for (const target of [100, 500, 1000, 3000, 7300]) {
      if (!badgeFirst['stars-' + target] && totalStars >= target) badgeFirst['stars-' + target] = day;
    }
    for (const target of [1, 5, 10, 30, 100]) {
      if (!badgeFirst['tasks-' + target] && taskCount >= target) badgeFirst['tasks-' + target] = day;
    }
    if (!badgeFirst['category-2000'] && stars[0] >= 2000) badgeFirst['category-2000'] = day;
    rows.push({day, xp: +xp.toFixed(4), level, ratingXp: +ratingXp.toFixed(4), taskXp: +taskXp.toFixed(4),
      stars: totalStars, taskCount, ratingReduction: +(normalXp - ratingXp).toFixed(4)});
  }
  return {id: profile.id, label: profile.label, first, badgeFirst, rows};
}
const base = profiles.map(profile => simulate(profile, 20261011));
const uncertainty = profiles.map(profile => {
  const finishDays = Array.from({length: 100}, (_, i) => simulate(profile, 1000 + i).first[100]);
  finishDays.sort((a, b) => a - b);
  return {id: profile.id, p10: finishDays[10], p50: finishDays[50], p90: finishDays[90]};
});
const output = {
  assumptions: {daysPerMonth: 30, thresholdMAX: threshold(100), seed: 20261011, ratingBase: 5, perStar: 2, createTask: 2,
    enhancedTasks, taskBoost, periodicReset: enhancedTasks ? 'Calendar periods in Hong Kong, starting 2026-10-11; separate counters per duration tier.' : 'None',
    tieredProgress, ratingRecordingTime: 'Delayed daily ratings recorded after 04:00 Hong Kong; grace does not apply in these scenarios.',
    taskTiers: enhancedTasks ? taskTiers.map(tier=>({...tier,maxDays:Number.isFinite(tier.maxDays)?tier.maxDays:'unlimited'})) : [],
    simulations: 100, uncertaintyMeaning: 'Only daily-star randomness; schedules and task completion are fixed.'},
  profiles: profiles.map(({weights, ...profile}) => profile),
  milestones: [10,20,30,50,75,90,99,100].map(level => ({level, xp: threshold(level)})),
  scenarios: base.map((scenario, i) => ({...scenario, uncertainty: uncertainty[i]}))
};
const resultFile = tieredProgress ? 'growth-results-candidate.json' : enhancedTasks ? 'growth-results-enhanced.json' : 'growth-results.json';
fs.writeFileSync(path.join(__dirname, resultFile), JSON.stringify(output, null, 2));
for (const scenario of output.scenarios) {
  console.log(JSON.stringify({id: scenario.id, levels: scenario.first, uncertainty: scenario.uncertainty,
    checkpoints: [1,7,30,90,180,365].map(day => scenario.rows[day]), badges: scenario.badgeFirst}));
}
console.log(JSON.stringify({thresholds: output.milestones}));
