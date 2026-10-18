import { DIMENSIONS, validDate, hongKong } from './index.js';

export const recordText = (state, date, dimension) => state.ratings[date]?.[dimension]?.note ?? state.ratingNotes?.[date]?.[dimension]?.note ?? '';
export const journalText = (state, date) => state.dailyNotes?.[date]?.note ?? state.dailyReviews?.[date]?.note ?? state.dailyReviews?.[date]?.summary ?? '';

// Optional JSON1 fields: a note without stars must never manufacture a zero or XP.
export function changeRecord(state, action, now) {
  const date = validDate(action.date ?? hongKong(now).date);
  if (date > hongKong(now).date) throw new Error('不能记录未来日期');
  if (typeof action.note !== 'string' || action.note.length > 4000) throw new Error('记录最多4000个字符');
  if (action.type === 'journal') {
    (state.dailyNotes ??= {})[date] = { note: action.note, updatedAt: now };
  } else {
    if (!DIMENSIONS.includes(action.dimension)) throw new Error('记录板块无效');
    const rating = state.ratings[date]?.[action.dimension];
    if (rating) rating.note = action.note;
    else ((state.ratingNotes ??= {})[date] ??= {})[action.dimension] = { note: action.note, updatedAt: now };
  }
}

export function markBusinessUpdate(state, date, now) {
  if (date === hongKong(now).date) (state.businessUpdates ??= {})[date] = now;
}
