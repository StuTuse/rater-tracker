// Short Chinese translations; verified sources live in docs/启动短句出处.md.
export const LAUNCH_QUOTES = [
  { text:'生命短暂，不要浪费时间活出别人的样子。', author:'乔布斯', source:'jobs-2005' },
  { text:'继续寻找，不要将就。', author:'乔布斯', source:'jobs-2005' },
  { text:'无论人生走向何处，都做一个建设者。', author:'蒂姆·库克', source:'cook-2019' },
  { text:'在意外中寻找希望。', author:'蒂姆·库克', source:'cook-2019' },
  { text:'聪明是一种天赋，善良是一种选择。', author:'杰夫·贝索斯', source:'bezos-2010' },
  { text:'到最后，我们就是自己所做的选择。', author:'杰夫·贝索斯', source:'bezos-2010' },
  { text:'我不再追求让人生完美，而是试着让它有趣。', author:'德鲁·休斯顿', source:'houston-2013' },
  { text:'你只需要做对一次。', author:'德鲁·休斯顿', source:'houston-2013' },
  { text:'想法不是一开始就完整的，它们会在实践中逐渐清晰。', author:'马克·扎克伯格', source:'zuckerberg-2017' },
  { text:'你只需要开始。', author:'马克·扎克伯格', source:'zuckerberg-2017' },
  { text:'给人生排好优先顺序。', author:'黄仁勋', source:'huang-caltech-2024' },
  { text:'每一次挫折，都让我们增长本领、磨炼品格。', author:'黄仁勋', source:'huang-caltech-2024' },
  { text:'机会还在别处，也可以自己创造一个。', author:'黄仁勋', source:'huang-caltech-2024' },
  { text:'难题会让你认识自己的能力。', author:'苏姿丰', source:'su-mit-2026' },
  { text:'让自己身边有能让你变得更好的人。', author:'苏姿丰', source:'su-mit-2026' },
  { text:'去把它弄明白。', author:'苏姿丰', source:'su-mit-2026' },
  { text:'专注能放大工作的效果。', author:'萨姆·奥特曼', source:'altman-success' },
  { text:'学会独立思考。', author:'萨姆·奥特曼', source:'altman-success' },
  { text:'相信指数增长，保持耐心，等待惊喜。', author:'萨姆·奥特曼', source:'altman-success' },
  { text:'永远相信梦想的力量。', author:'雷军', source:'lei-whu-2015', language:'zh' },
  { text:'我一定要去试一下。', author:'雷军', source:'lei-whu-2015', language:'zh' },
  { text:'开开心心就好。', author:'雷军', source:'lei-whu-2015', language:'zh' }
];
const quote = index => `${LAUNCH_QUOTES[index].text} —— ${LAUNCH_QUOTES[index].author}`;
// 92 quiet encouragements, questions and attributed excerpts mixed together.
export const LAUNCH_LINES = [
  // Original groups keep their order; new attributed excerpts are interspersed.
  '先做一件小事，今天就有了起点。',
  '今天有没有给真正想做的事留一点时间？',
  quote(0),
  '慢一点也可以，方向可以边走边调整。',
  '今天剪辑了吗？',
  '不用一下子想清楚所有事。',
  '把眼前这一小步做完，再看下一步。',
  '你现在忙的事，还是自己想要的吗？',
  '普通的一天，也能留下一点进展。',
  '允许自己从不熟练开始。',
  quote(10),
  // 11–20
  '事情不必很大，做成一点就好。',
  '今天写稿了吗？',
  '先把想法放到纸上，暂时不用评判它。',
  quote(2),
  '能解决一个小问题，也是一份实在的工作。',
  '今天是在推进，还是只是在忙碌？',
  '认真做的小事，会慢慢有自己的分量。',
  '有些答案，要动手以后才会出现。',
  '那件一直想开始的事，第一步是什么？',
  quote(6),
  quote(13),
  quote(16),
  // 21–30
  '不顺利的时候，先看看具体卡在哪里。',
  '今天锻炼了吗？',
  '可以换一种方法，不必急着否定自己。',
  '昨天没做完的事，今天仍然可以继续。',
  quote(4),
  '对自己耐心一点，对别人也一样。',
  '今天有没有认真听完一个人的话？',
  '把问题问清楚，常常就走近了答案。',
  '你需要再努力一点，还是先休息一下？',
  '进展有时只是比昨天少一点困惑。',
  quote(19),
  // 31–40
  '不必让每一天都成为值得展示的一天。',
  '今天好好睡觉了吗？',
  quote(8),
  '完成一个粗糙的版本，再慢慢改。',
  '给尝试留一点空间，也给错误留一点余地。',
  '你有没有把准备，当成了迟迟不开始的理由？',
  '先验证一个想法，暂时不用证明所有可能。',
  '改变计划，不代表之前的路白走了。',
  '今天有没有发现一个值得继续追问的问题？',
  '好奇心可以从一件很小的事开始。',
  quote(11),
  quote(14),
  // 41–50
  '不确定的时候，可以先试一个小版本。',
  '今天好好学习了吗？',
  '把学到的东西用一次，会更容易记住。',
  quote(1),
  '别急着把一次结果当成对自己的定论。',
  '这件事对你重要，还是只是别人觉得重要？',
  '有些路需要时间，不用每天检查终点。',
  '你可以保留自己的节奏。',
  '今天有没有为自己的选择承担一点责任？',
  quote(5),
  quote(17),
  quote(20),
  // 51–60
  '有余力的时候，再向前多走一点。',
  '今天交新朋友了吗？',
  '一句真诚的问候，不需要很好的开场白。',
  '关系可以慢慢建立，不必急着证明什么。',
  quote(3),
  '意料之外的事，也可以先了解再判断。',
  '今天有没有试着理解一个不同的看法？',
  '留一点时间给没有标准答案的事情。',
  '你最近一次为自己感到满意，是因为什么？',
  '不用等到做得很好，才承认自己有进步。',
  quote(12),
  // 61–70
  '把想做的事拆小一点，会更容易靠近。',
  '今天能不能先完成最重要的一小部分？',
  quote(7),
  '一次尝试的价值，也在于知道哪里行不通。',
  '做错了可以修正，没想通可以再想。',
  '你是在解决问题，还是在回避一个决定？',
  '先把能控制的部分照顾好。',
  '今天不用把所有事情都安排妥当。',
  '有没有一件事，可以用更简单的方式完成？',
  '做得少一点、清楚一点，也可以。',
  quote(15),
  quote(18),
  // 71–80
  '给自己留一点安静，听听真实的想法。',
  '如果没人评价，你还愿意做这件事吗？',
  '不要把别人的进度表，当成自己的期限。',
  '认真过好眼前这一段，不必提前回答整个人生。',
  quote(9),
  '想走远一点，也可以先从身边开始。',
  '今天有没有做一件会让明天轻松一点的事？',
  '暂时没有结果，也不妨碍继续观察和尝试。',
  '今天结束时，你想记住哪一个小瞬间？',
  '留下一点完成，也留下一点期待。',
  quote(21)
];
export function chooseLaunchLine(previous, random = Math.random()) {
  const choices = LAUNCH_LINES.filter(line => line !== previous);
  return choices[Math.min(choices.length - 1, Math.max(0, Math.floor(random * choices.length)))];
}
// UI-only queue: withdraw invalid notices before showing; never change rewards.
export class BadgeNoticeQueue {
  pending = [];
  current = [];
  add(ids) { this.pending = [...new Set([...this.pending, ...ids.filter(id => !this.current.includes(id))])]; }
  reconcile(earned) {
    const valid = new Set(earned);
    this.pending = this.pending.filter(id => valid.has(id));
    this.current = this.current.filter(id => valid.has(id));
  }
  take() { if (this.current.length || !this.pending.length) return []; this.current = this.pending.splice(0); return this.current; }
  dismiss() { this.current = []; }
  clear() { this.pending = []; this.current = []; }
}
