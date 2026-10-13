import { BADGES } from './badges.js';

export const ART = Object.freeze({
  pattern: 'assets/generated/journal-pattern.png',
  task: 'assets/generated/empty-task.png',
  ledger: 'assets/generated/empty-ledger.png',
});
export const badgeArt = id => `assets/generated/badges/${id}.png`;
export const ART_ASSETS = Object.freeze([...Object.values(ART), ...BADGES.map(b => badgeArt(b.id))]);
