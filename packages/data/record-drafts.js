// Accept the old plain-object drafts and current timestamped envelopes.
// A successful empty flush must outrank an older, failed-to-clear cache.
export function recoverRecordDrafts(legacy = {}, cached = null) {
  const envelope=value=>value?.version===1 && Number.isFinite(value.at) && value.entries && typeof value.entries==='object'
    ? value : {at:0,entries:Array.isArray(value)?Object.fromEntries(value):value??{}};
  let selected=envelope(legacy);
  try { if(cached!==null){const local=envelope(JSON.parse(cached));if(local.at>=selected.at)selected=local;} } catch {}
  const entries=new Map();
  for(const [key,value] of Object.entries(selected.entries)) if(/^\d{4}-\d{2}-\d{2}\/(study|work|health|life|journal)$/.test(key) && typeof value==='string' && value.length<=4000) entries.set(key,value);
  return {at:selected.at,entries};
}
