/**
 * Tests Feeder — ensure / initSeries (régression stack overflow)
 * Exécution : node tests/feeder.test.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function loadGameScripts() {
  const ctx = vm.createContext({
    console,
    Math,
    Date,
    JSON,
    Array,
    Object,
    String,
    Number,
    parseInt,
    parseFloat,
    isNaN,
    window: {},
  });
  ctx.window = ctx;
  ['data.js', 'save.js', 'immersion.js', 'feeder.js'].forEach(file => {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', file), 'utf8'), ctx);
  });
  return ctx;
}

function freshSave(overrides = {}) {
  return {
    season: 2025,
    playerTeamId: 'red_bull',
    budget: 100,
    race: 1,
    immersion: { juniorAcademy: [] },
    ...overrides,
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

console.log('Feeder tests\n');

test('ensure() ne provoque pas de stack overflow', () => {
  const { Feeder } = loadGameScripts();
  const save = freshSave();
  assert.doesNotThrow(() => Feeder.ensure(save));
  assert.ok(save.feeder.f3.drivers.length > 0, 'F3 drivers initialisés');
  assert.ok(save.feeder.f2.drivers.length > 0, 'F2 drivers initialisés');
});

test('initSeries() peut être appelé directement sans récursion', () => {
  const { Feeder } = loadGameScripts();
  const save = freshSave({ feeder: { f3: { season: 2025, round: 0, totalRounds: 10, drivers: [], results: [] } } });
  assert.doesNotThrow(() => Feeder.initSeries(save, 'f3'));
  assert.ok(save.feeder.f3.drivers.length > 0);
});

test('ensure() est idempotent (double appel stable)', () => {
  const { Feeder } = loadGameScripts();
  const save = freshSave();
  Feeder.ensure(save);
  const f3Count = save.feeder.f3.drivers.length;
  const f2Count = save.feeder.f2.drivers.length;
  Feeder.ensure(save);
  assert.equal(save.feeder.f3.drivers.length, f3Count);
  assert.equal(save.feeder.f2.drivers.length, f2Count);
});

test('afterRace() retourne un rapport feeder', () => {
  const ctx = loadGameScripts();
  const save = freshSave();
  ctx.Feeder.ensure(save);
  const gp = { circuitName: 'Test GP', season: 2025, raceNumber: 1 };
  const report = ctx.Feeder.afterRace(save, gp);
  assert.ok(report, 'rapport non null');
  assert.ok(report.teamName, 'nom équipe satellite');
  assert.ok(report.f3 || report.f2, 'au moins une série simulée');
  assert.ok(gp.feeder, 'rapport attaché au GP');
});

test('getPlayerTeamStanding() renvoie player_academy', () => {
  const { Feeder } = loadGameScripts();
  const save = freshSave();
  Feeder.ensure(save);
  const st = Feeder.getPlayerTeamStanding(save, 'f2');
  assert.ok(st.position >= 1, 'position constructeur valide');
  assert.ok(typeof st.points === 'number');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
