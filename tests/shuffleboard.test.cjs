'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = readFileSync(path.join(__dirname, '../dist/games.js'), 'utf8');

function createGame(seed = 42, fixed = false) {
  const math = Object.create(Math);
  math.random = fixed ? () => .5 : () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const context = { window: {}, Math: math };
  vm.runInNewContext(source, context);
  const events = { scores: [], finishes: [], controls: [] };
  const game = context.window.RetroGames.shuffleboard.create({
    score: value => events.scores.push(value), status() {}, beep() {},
    finish: (won, message) => events.finishes.push({ won, message }),
    shot: state => events.controls.push(state)
  });
  game.reset();
  return { game, events };
}

function advance(game, seconds, fps = 120, input = new Set()) {
  while (seconds > 1e-9) {
    const dt = Math.min(seconds, 1 / fps);
    game.update(dt, input); seconds -= dt;
  }
}

function shoot(game, strength, x = 640, y = 217, fps = 120) {
  game.pointer(x, y);
  assert.equal(game.beginShot(), true);
  advance(game, strength * game.inspect().chargeSeconds, fps);
  game.releaseShot();
}

function until(game, condition, fps = 120, limit = 30) {
  for (let i = 0; i < limit * fps; i++) {
    if (condition(game.inspect())) return game.inspect();
    game.update(1 / fps);
  }
  assert.fail('Game did not reach the expected state in ' + limit + ' seconds');
}

test('fresh match, independent snapshots, and clean reset', () => {
  const { game, events } = createGame();
  const initial = game.inspect();
  assert.equal(initial.round, 1);
  assert.equal(initial.turn, 'player');
  assert.equal(initial.stage, 'aiming');
  assert.equal(initial.charging, false);
  initial.totals.player = 99; initial.table.left = -999;
  assert.equal(game.inspect().totals.player, 0);
  assert.equal(game.inspect().table.left, 48);
  shoot(game, .5); advance(game, 1); game.reset();
  assert.equal(game.inspect().pucks.length, 0);
  assert.equal(game.inspect().used.player, 0);
  assert.equal(game.inspect().lastShot, null);
  assert.equal(events.scores.at(-1), 0);
});

test('holding charges without launching; longer holds produce longer glides', () => {
  const positions = [];
  for (const strength of [.15, .4, .7]) {
    const { game } = createGame(42, true);
    game.beginShot(); advance(game, strength * 1.65);
    assert.equal(game.inspect().pucks.length, 0);
    assert.ok(Math.abs(game.inspect().power - strength) < 1e-9);
    game.releaseShot(); game.releaseShot();
    assert.equal(game.inspect().used.player, 1, 'release only launches once');
    const resting = until(game, s => s.pucks[0].vx === 0 && s.pucks[0].vy === 0);
    positions.push(resting.pucks[0].x);
  }
  assert.ok(positions[1] > positions[0] + 150);
  assert.ok(positions[2] > positions[1] + 190);
});

test('charge clamps at full strength and an overpowered shot falls off', () => {
  const { game } = createGame(42, true);
  game.beginShot(); advance(game, 6);
  assert.equal(game.inspect().power, 1);
  assert.equal(game.inspect().pucks.length, 0);
  game.releaseShot();
  const state = until(game, s => s.pucks[0].out);
  assert.equal(state.pucks[0].points, 0);
  assert.equal(state.tableScore.player, 0);
});

test('canceling a held shot never fires or consumes a puck', () => {
  const { game } = createGame();
  game.beginShot(); advance(game, .8); game.releaseInput(); game.releaseShot(); advance(game, 1);
  assert.equal(game.inspect().power, 0);
  assert.equal(game.inspect().charging, false);
  assert.equal(game.inspect().pucks.length, 0);
  assert.equal(game.inspect().used.player, 0);
  assert.equal(game.beginShot(), true);
});

test('drag release preserves a separately held shot; aim is bounded and invalid coordinates are ignored', () => {
  const { game } = createGame();
  advance(game, 3, 120, new Set(['up']));
  assert.equal(game.inspect().aim, -.28);
  advance(game, 3, 120, new Set(['down']));
  assert.equal(game.inspect().aim, .28);
  game.pointer(640, 217); game.pointer(NaN, Infinity);
  assert.equal(game.inspect().aim, 0);
  game.beginShot(); advance(game, .7); game.releasePointer();
  assert.equal(game.inspect().charging, true);
  game.releaseShot();
  assert.equal(game.inspect().pucks.length, 1);
});

test('power and heading vary between shots but stay within a small range', () => {
  const shots = [];
  for (const seed of [1, 71, 400, 912, 2001, 8999]) {
    const { game } = createGame(seed);
    shoot(game, .65); shots.push(game.inspect().lastShot);
  }
  assert.ok(new Set(shots.map(s => s.speed)).size > 1);
  assert.ok(new Set(shots.map(s => s.angle)).size > 1);
  const ideal = Math.sqrt(2 * 230 * (65 + .65 * 720));
  for (const shot of shots) {
    assert.ok(Math.abs(shot.angle) <= .008 + .065 * .65 ** 2);
    assert.ok(shot.speed >= ideal * Math.sqrt(.94) && shot.speed <= ideal * Math.sqrt(1.06));
  }
});

test('higher power increases direction randomness for the same random samples', () => {
  for (const seed of [1, 71, 400, 912]) {
    const angles = [.2, .6, 1].map(power => {
      const { game } = createGame(seed);
      shoot(game, power);
      return Math.abs(game.inspect().lastShot.angle);
    });
    assert.ok(angles[0] < angles[1] && angles[1] < angles[2]);
    assert.ok(angles[2] > angles[0] * 5);
  }
});

test('whole-puck boundaries score 0, 1, 2, 3 correctly and edge overhang scores zero', () => {
  for (const [x, expected] of [[480, 0], [482, 1], [548, 1], [550, 2], [616, 2], [618, 3], [663, 3], [669, 0]]) {
    const { game } = createGame(42, true);
    shoot(game, (x - 94 - 65) / 720);
    const state = until(game, s => s.pucks[0].vx === 0);
    assert.ok(Math.abs(state.pucks[0].x - x) < .02);
    assert.equal(state.pucks[0].points, expected, 'puck centered at x=' + x);
    assert.equal(state.totals.player, 0, 'points are banked only at round end');
  }
});

test('CPU takes exactly one turn and collisions move an already resting player puck', () => {
  const { game } = createGame(42, true);
  shoot(game, (585 - 94 - 65) / 720);
  const resting = until(game, s => s.stage === 'aiming' && s.turn === 'cpu');
  const x = resting.pucks[0].x;
  assert.equal(game.beginShot(), false);
  game.releaseShot();
  const next = until(game, s => s.stage === 'aiming' && s.turn === 'player');
  assert.equal(next.used.player, 1);
  assert.equal(next.used.cpu, 1);
  assert.equal(next.pucks.length, 2);
  assert.ok(next.pucks[0].x > x + 20, 'CPU impact transfers momentum');
});

function playMatch(game, fps, strategy) {
  let state = game.inspect(), playerShot = 0, previousRound = 1, settledRounds = 0;
  for (let frame = 0; frame < fps * 240 && !state.ended; frame++) {
    if (state.stage === 'aiming' && state.turn === 'player') {
      if (!state.charging) {
        const y = strategy === 'overshoot' ? 217 : [146, 286, 182, 252][playerShot++ % 4];
        game.pointer(630, y); game.beginShot();
      }
      if (state.power >= (strategy === 'overshoot' ? 1 : .66)) game.releaseShot();
    }
    game.update(1 / fps); state = game.inspect();
    assert.ok(state.used.player <= 4 && state.used.cpu <= 4);
    if (state.stage === 'roundOver' || state.ended) {
      assert.equal(state.used.player, 4); assert.equal(state.used.cpu, 4);
      assert.equal(state.pucks.length, 8);
    }
    if (state.round !== previousRound) {
      settledRounds++; previousRound = state.round;
      assert.equal(state.turn, state.round % 2 ? 'player' : 'cpu');
    }
    for (const puck of state.pucks) {
      assert.ok([puck.x, puck.y, puck.vx, puck.vy].every(Number.isFinite));
      assert.ok(puck.points >= 0 && puck.points <= 3);
      if (puck.out) assert.equal(puck.points, 0);
    }
  }
  assert.equal(state.ended, true);
  assert.ok(settledRounds >= 2);
  assert.notEqual(state.totals.player, state.totals.cpu);
  return state;
}

for (const fps of [30, 60, 144]) {
  test('complete scored CPU match and stable ending at ' + fps + ' fps', () => {
    const { game, events } = createGame();
    const state = playMatch(game, fps, 'overshoot');
    assert.equal(state.round, 3);
    assert.equal(events.finishes.length, 1);
    assert.equal(events.finishes[0].won, false);
    assert.equal(events.scores.at(-1), state.totals.player);
    assert.ok(state.totals.cpu > state.totals.player);
    advance(game, 3, fps); game.beginShot(); game.releaseShot();
    assert.equal(events.finishes.length, 1);
    assert.equal(JSON.stringify(game.inspect()), JSON.stringify(state));
  });
}

test('accurately placed shots can beat the CPU', () => {
  let wins = 0;
  for (let seed = 1; seed <= 8; seed++) {
    const { game, events } = createGame(seed);
    const state = playMatch(game, 60, 'placed');
    assert.equal(events.finishes[0].won, state.totals.player > state.totals.cpu);
    if (events.finishes[0].won) wins++;
  }
  assert.ok(wins > 0, 'A player placing shots in scoring zones should be able to win');
});

test('tied regulation score plays an extra round before declaring a winner', () => {
  const { game, events } = createGame(17);
  const state = playMatch(game, 60, 'placed');
  assert.equal(state.round, 4);
  assert.equal(events.finishes.length, 1);
  assert.notEqual(state.totals.player, state.totals.cpu);
});
