export const GROWTH_STAGES = [
  { id:1, from:1, to:9, name:'新芽', flow:'seed', gold:'#dbc16b', light:'#faedbd', period:7.2, upgrade:680 },
  { id:2, from:10, to:19, name:'启航', flow:'ribbon', gold:'#d8b347', light:'#ffe3a0', period:6.8, upgrade:740 },
  { id:3, from:20, to:29, name:'晨星', flow:'spark', gold:'#dba92f', light:'#ffe78c', period:6.4, upgrade:820 },
  { id:4, from:30, to:39, name:'光羽', flow:'wave', gold:'#d4a12a', light:'#fff0ac', period:6.1, upgrade:900 },
  { id:5, from:40, to:49, name:'桂冠', flow:'halo', gold:'#cfa034', light:'#ffe59a', period:5.8, upgrade:980 },
  { id:6, from:50, to:59, name:'星冕', flow:'facet', gold:'#d29a1c', light:'#ffe58b', period:5.6, upgrade:1060 },
  { id:7, from:60, to:69, name:'曜轮', flow:'orbit', gold:'#dca221', light:'#fff0b1', period:5.4, upgrade:1140 },
  { id:8, from:70, to:79, name:'天翼', flow:'feather', gold:'#c99424', light:'#fff1b5', period:5.2, upgrade:1220 },
  { id:9, from:80, to:89, name:'日辉', flow:'ray', gold:'#dba51f', light:'#fff5cf', period:5.0, upgrade:1300 },
  { id:10, from:90, to:'MAX', name:'恒耀', flow:'corona', gold:'#d19b17', light:'#fff9db', period:4.8, upgrade:1400 }
];

export function growthStage(level) {
  if (level === 'MAX') return GROWTH_STAGES[9];
  return GROWTH_STAGES[Math.min(9, Math.max(0, Math.floor(Number(level) / 10)))];
}

const subjects = [
  '<path d="M40 65V39M40 48Q18 47 19 27q21-1 21 21Zm0-9Q39 19 60 17q5 19-20 22Z" fill="#e9efce"/><path d="m24 34 16 14m0-9 14-15"/>',
  '<path d="M32 46h16l-3 20H35Z" fill="url(#metal)"/><path d="M24 44h32M40 39Q17 29 36 10q-2 13 7 14 5-8 4-14 20 19-7 29Z" fill="url(#fire)"/><path d="M36 50h8m-9 7h10"/>',
  '<path d="m40 9 9 20 22 5-16 16 2 22-17-12-18 12 3-23L9 34l23-5Z" fill="url(#metal)"/><path d="m40 20 5 14 15 3-11 10 2 14-11-8-11 8 2-15-11-9 15-3Z" fill="#fff8d5"/><path d="m40 28 3 8 8 3-8 4-3 9-3-9-8-4 8-3Z" fill="#eac64f"/>',
  '<path d="M40 63Q7 56 10 20q12 7 18 17Q22 18 31 10q12 15 9 53Zm0 0q33-7 30-43-12 7-18 17 6-19-3-27-12 15-9 53Z" fill="url(#metal)"/><path d="m17 32 17 27m-15-13 16 16m28-30L46 59m15-13L45 62M40 25v45"/>',
  '<path d="M37 67Q9 60 16 25m27 42q28-7 21-42"/><path d="M23 54Q4 57 7 39q16-3 16 15Zm-7-14Q0 38 10 23q13 2 6 17Zm3-15Q8 17 24 10q10 9-5 15Zm38 29q19 3 16-15-16-3-16 15Zm7-14q16-2 6-17-13 2-6 17Zm-3-15q11-8-5-15-10 9 5 15Z" fill="url(#metal)"/><path d="m40 24 5 10 11 3-8 8 1 12-9-6-9 6 1-12-8-8 11-3Z" fill="#f4d471"/><path d="M30 71h20"/>',
  '<path d="m12 25 16 11 12-23 12 23 16-11-8 35H20Z" fill="url(#metal)"/><path d="M21 61h38v9H21Z" fill="#efd477"/><path d="m40 35 7 9-7 12-7-12Z" fill="#fff8df"/><circle cx="12" cy="22" r="4" fill="#efce62"/><circle cx="40" cy="10" r="4" fill="#ffe994"/><circle cx="68" cy="22" r="4" fill="#efce62"/><path d="M26 65h28"/>',
  '<g fill="url(#metal)"><path d="M37 3h6l2 13h-10Zm0 74h6l2-13h-10ZM3 37v6l13 2V35Zm74 0v6l-13 2V35Z"/><path d="m13 9 5-3 10 13-7 5Zm54 0-5-3-10 13 7 5ZM13 71l5 3 10-13-7-5Zm54 0-5 3-10-13 7-5Z"/></g><circle cx="40" cy="40" r="24" fill="#f8e294"/><circle cx="40" cy="40" r="17" fill="#fff8df"/><path d="m40 24 5 10 11 6-11 6-5 10-5-10-11-6 11-6Z" fill="url(#metal)"/>',
  '<path d="M32 59Q7 58 3 22l18 10-4-17 19 22m12 22q25-1 29-37L59 32l4-17-19 22" fill="url(#metal)"/><path d="m9 32 23 20M13 44l20 13m38-25L48 52m19-8L47 57"/><path d="m40 13 15 24-5 25-10 10-10-10-5-25Z" fill="#fff2b5"/><path d="m40 23 8 17-8 21-8-21Z" fill="url(#metal)"/><path d="M40 23v38m-8-21h16"/>',
  '<circle cx="40" cy="40" r="31" fill="none" stroke="#d3af51"/><path d="M40 2v10m0 56v10M2 40h10m56 0h10M12 12l9 9m38 38 9 9M12 68l9-9m38-38 9-9"/><path d="M40 61Q4 58 9 23q15 7 23 23L25 17l15 12 15-12-7 29q8-16 23-23 5 35-31 38Z" fill="url(#metal)"/><path d="m40 12 11 25-11 26-11-26Z" fill="#fff9d9"/><path d="m40 25 5 12-5 13-5-13Z" fill="#dfb433"/><path d="M26 68h28"/>',
  '<path d="M17 54Q3 43 5 20l20 15-9-20 19 14m28 25q14-11 12-34L55 35l9-20-19 14" fill="url(#metal)"/><circle cx="40" cy="40" r="27" fill="none"/><circle cx="40" cy="40" r="22" fill="#fff3bf"/><path d="m20 35 11 7 9-21 9 21 11-7-5 23H25Z" fill="url(#metal)"/><path d="m40 36 6 10-6 10-6-10Z" fill="#fffbe7"/><path d="M27 62h26M40 3v9M40 68v9M3 40h9m56 0h9"/><circle cx="40" cy="14" r="3" fill="#f4d061"/><path d="m10 10 3 6 6 3-6 3-3 6-3-6-6-3 6-3Zm60 0 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" fill="#f4d061"/>'
];

export function levelEmblem(stage, max = false) {
  const prefix = `level-metal-${stage.id}`;
  const art = subjects[stage.id - 1].replaceAll('url(#metal)', `url(#${prefix})`).replaceAll('url(#fire)', `url(#${prefix}-fire)`);
  const finale = max ? '<g class="level-constellation" fill="#ffe998" stroke="#d7ad38"><circle cx="40" cy="40" r="36" fill="none" stroke-dasharray="2 5"/><path d="m26 3 2 3 4 1-4 2-2 4-1-4-4-2 4-1Zm28 0 2 3 4 1-4 2-2 4-1-4-4-2 4-1Zm-28 65 2 3 4 1-4 2-2 4-1-4-4-2 4-1Zm28 0 2 3 4 1-4 2-2 4-1-4-4-2 4-1Z"/></g>' : '';
  return `<svg class="level-emblem" data-emblem="${stage.id}${max ? '-max' : ''}" viewBox="-3 -3 86 86" aria-hidden="true"><defs><linearGradient id="${prefix}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff2b5"/><stop offset=".45" stop-color="${stage.light}"/><stop offset=".75" stop-color="${stage.gold}"/><stop offset="1" stop-color="#eaca64"/></linearGradient><linearGradient id="${prefix}-fire" x2="0" y2="1"><stop stop-color="#fff0a5"/><stop offset="1" stop-color="#e1b13c"/></linearGradient></defs><g fill="none" stroke="#a18030" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${art}${finale}</g></svg>`;
}

const poses = [
  ['translateY(6px) scale(.75)', 'translateY(-2px) scale(1.08)'],
  ['translateY(10px) scale(.9)', 'translateY(-7px) scale(1.08)'],
  ['rotate(-20deg) scale(.65)', 'rotate(10deg) scale(1.15)'],
  ['scaleX(.45) scaleY(1.1)', 'scaleX(1.16) scaleY(.95)'],
  ['rotate(-28deg) scale(.85)', 'rotate(8deg) scale(1.1)'],
  ['translateY(-14px) scale(.85)', 'translateY(4px) scale(1.14)'],
  ['rotate(-110deg) scale(.65)', 'rotate(18deg) scale(1.14)'],
  ['scaleX(.35) scaleY(1.16)', 'scaleX(1.18) scaleY(.92)'],
  ['rotate(-14deg) scale(.45)', 'rotate(6deg) scale(1.22)'],
  ['translateY(12px) rotate(-10deg) scale(.4)', 'translateY(-5px) rotate(3deg) scale(1.2)']
];

export function stageUpgradeFrames(stage, max = false) {
  const pose = poses[stage.id - 1];
  const shine = stage.id < 5 ? 'drop-shadow(0 2px 3px #d6af3430)' : `drop-shadow(0 0 ${max ? 16 : stage.id + 1}px #f5ce5c9c)`;
  return [
    { transform: pose[0], filter:'drop-shadow(0 0 0 transparent)', opacity:.6 },
    { transform: pose[1], filter:shine, opacity:1, offset:.56 },
    { transform:'translateY(0) rotate(0deg) scale(1)', filter:'drop-shadow(0 2px 3px #cda73522)', opacity:1 }
  ];
}

export function paintStage(growth, level) {
  const stage = growthStage(level), max = level === 'MAX', key = `${stage.id}${max ? '-max' : ''}`;
  growth.dataset.stage = String(stage.id);
  growth.style.setProperty('--stage-gold', stage.gold);
  growth.style.setProperty('--stage-light', stage.light);
  growth.style.setProperty('--stage-flow', `stage-${stage.flow}`);
  growth.style.setProperty('--stage-period', `${stage.period}s`);
  const art = growth.querySelector('#level-art');
  if (art && art.dataset.stage !== key) { art.innerHTML = levelEmblem(stage, max); art.dataset.stage = key; }
  growth.querySelector('.eyebrow').textContent = `等级经验 · ${stage.name}`;
  growth.querySelector('.level-medallion').title = `第${stage.id}阶段 · ${stage.name} · Lv.${stage.from}～${stage.to === 'MAX' ? 'MAX' : stage.to}`;
  return stage;
}
