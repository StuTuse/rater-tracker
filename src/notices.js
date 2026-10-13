// Launch reflections stay within the user's six chosen directions.
export const LAUNCH_LINES = [
  '今天剪辑了吗？', '时间线上，有一段可以再看一遍。', '今天的素材整理好了吗？', '剪掉一处多余的停顿，也算进展。', '字幕和声音，再听看一遍。', '那段一直没剪完的片子，今天想动一动吗？',
  '今天写稿了吗？', '先写一句，后面的慢慢来。', '今天的稿子，有没有说清楚想说的事？', '初稿可以先留着不完美。', '那段不顺的文字，今天读过一遍了吗？', '有没有给下一篇稿子留下一点想法？',
  '今天锻炼了吗？', '身体今天感觉怎么样？', '今天有活动一下身体吗？', '练完以后，记得留一点恢复的时间。', '今天的训练量，适合现在的自己吗？', '上次想练的那个动作，今天试了吗？',
  '今天好好睡觉了吗？', '今晚准备几点睡？', '昨晚睡得还好吗？', '睡前的屏幕，今天想早一点放下吗？', '困了的时候，可以去睡。', '最近几天，有睡够吗？',
  '今天好好学习了吗？', '今天学到的东西，还记得一点吗？', '那处没弄懂的地方，要再看一遍吗？', '学完一小节，也可以停下来想一想。', '今天有没有把学到的东西试一试？', '上次留下的问题，今天有答案了吗？',
  '今天交新朋友了吗？', '今天有和新认识的人聊几句吗？', '上次认识的朋友，后来还有联系吗？', '认识一个人，可以从一句问候开始。', '今天有没有听听新朋友的故事？', '那句想发给朋友的问候，发出去了吗？'
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
