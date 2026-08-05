/**
 * Tests Immersion v2 — seasonStory, humeurs, rivalités
 * Exécution : node tests/immersion.test.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function loadScripts(extra = []) {
  const ctx = vm.createContext({
    console, Math, Date, JSON, Array, Object, String, Number, parseInt, parseFloat, isNaN, window: {},
  });
  ctx.window = ctx;
  ['data.js', 'save.js', 'events.js', 'feeder.js', 'immersion.js', ...extra].forEach(file => {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', file), 'utf8'), ctx);
  });
  return ctx;
}

function freshSave() {
  return {
    season: 2025, playerTeamId: 'red_bull', budget: 100, race: 2,
    teamStandings: { red_bull: 40, mercedes: 55, ferrari: 50 },
    immersion: { juniorAcademy: [{ id: 'j1', firstName: 'Leo', name: 'Test', promoted: false }] },
    reputation: { sport: 50, media: 50, tech: 50, finance: 50 },
  };
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('Immersion tests\n');

test('initSeasonRivals() définit pilote et équipe rivale', () => {
  const { Immersion } = loadScripts();
  const save = freshSave();
  Immersion.initSeasonRivals(save);
  assert.ok(save.immersion.seasonRivals.driverName);
  assert.ok(save.immersion.seasonRivals.teamName);
});

test('pushSeasonStory() ajoute une entrée', () => {
  const { Immersion } = loadScripts();
  const save = freshSave();
  Immersion.ensure(save);
  const gp = { circuitName: 'Monaco', season: 2025, raceNumber: 2, weather: 'Sec', teamPoints: 12, playerResults: [{ position: 5, points: 8 }] };
  Immersion.pushSeasonStory(save, gp, { position: 5 }, 12, ['Projet stable']);
  assert.equal(save.immersion.seasonStory.length, 1);
  assert.ok(save.immersion.seasonStory[0].headline.includes('Monaco'));
});

test('getRaceRewardMultiplier() malus si sponsors bas', () => {
  const { Immersion } = loadScripts();
  const save = freshSave();
  Immersion.ensure(save);
  save.immersion.sponsorMood.value = 40;
  assert.equal(Immersion.getRaceRewardMultiplier(save), 0.92);
  save.immersion.sponsorMood.value = 60;
  assert.equal(Immersion.getRaceRewardMultiplier(save), 1);
});

test('getBriefingStakes() détecte pression board', () => {
  const { Immersion } = loadScripts();
  const save = freshSave();
  save.boardPressure = 70;
  Immersion.ensure(save);
  const stakes = Immersion.getBriefingStakes(save);
  assert.ok(stakes.some(s => s.text.includes('board')));
});

test('applyGpChoice() une seule fois par GP', () => {
  const { Immersion } = loadScripts();
  const save = freshSave();
  Immersion.ensure(save);
  const gp = { raceNumber: 2, circuitName: 'Test' };
  const r1 = Immersion.applyGpChoice(save, 'stay_quiet', gp);
  assert.ok(r1.ok);
  const r2 = Immersion.applyGpChoice(save, 'defend_driver', gp);
  assert.ok(!r2.ok);
});

test('buildJournalExtras() inclut fil de saison', () => {
  const { Immersion } = loadScripts();
  const save = freshSave();
  Immersion.ensure(save);
  save.immersion.seasonStory.push({ headline: 'Test story', race: 1, circuitName: 'X' });
  const lines = Immersion.buildJournalExtras({ weather: 'Sec', safetyCarLaps: 0 }, save);
  assert.ok(lines.some(l => l.title === 'Fil de saison'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
