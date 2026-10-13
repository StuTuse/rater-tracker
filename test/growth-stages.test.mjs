import test from 'node:test';
import assert from 'node:assert/strict';
import { GROWTH_STAGES, growthStage, levelEmblem, stageUpgradeFrames } from '../src/growth-stages.js';
import { levelAt, SCALE } from '../src/core.js';

test('ten visual stages cover every level and MAX with correct boundary reversal', () => {
  assert.equal(GROWTH_STAGES.length,10);
  for(let level=1;level<=99;level++) {
    const stage=growthStage(level);
    assert.ok(level>=stage.from&&(stage.to==='MAX'||level<=stage.to));
  }
  for(let level=10;level<=90;level+=10) {
    const units=((level-1)*30+(level-1)*(level-2)*2.5)*SCALE;
    assert.equal(growthStage(levelAt(units).level).id,level/10+1);
    assert.equal(growthStage(levelAt(units-1).level).id,level/10);
  }
  assert.equal(growthStage('MAX').id,10);
});
test('each phase has independent artwork and upgrade choreography; MAX remains phase ten', () => {
  assert.equal(new Set(GROWTH_STAGES.map(s=>levelEmblem(s))).size,10);
  assert.equal(new Set(GROWTH_STAGES.map(s=>JSON.stringify(stageUpgradeFrames(s)))).size,10);
  assert.equal(new Set(GROWTH_STAGES.map(s=>s.flow)).size,10);
  const max=levelEmblem(growthStage('MAX'),true);
  assert.notEqual(max,levelEmblem(growthStage(99)));
  assert.ok(max.includes('level-constellation'));
});
