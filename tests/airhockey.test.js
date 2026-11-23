import assert from 'node:assert/strict';
import { test } from 'vitest';
import { airhockey } from '../src/games.js';

function createGame(seed = 42) {
  const rng = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const events = { scores: [], statuses: [], finishes: [] };
  const game = airhockey({
    score: value => events.scores.push(value),
    status: value => events.statuses.push(value),
    finish: (won, message) => events.finishes.push({ won, message }),
    beep() {}
  }, rng);
  game.reset();
  return { game, events };
}

function advance(game, seconds, input = new Set()) {
  for (let i = 0; i < Math.round(seconds * 120); i++) game.update(1 / 120, input);
}

test('reset starts a fresh face-off and inspect returns independent snapshots', () => {
  const { game, events } = createGame();
  const initial = game.inspect();
  assert.equal(initial.playerPoints, 0);
  assert.equal(initial.cpuPoints, 0);
  assert.equal(initial.ended, false);
  assert.ok(initial.serve > 0);
  initial.player.x = -1000; initial.puck.x = -1000;
  assert.ok(game.inspect().player.x > 0);
  assert.equal(game.inspect().puck.x, 360);
  advance(game, .2, new Set(['right']));
  game.reset();
  assert.equal(game.inspect().player.x, 126);
  assert.equal(events.scores.at(-1), 0);
  assert.equal(events.statuses.at(-1), 'YOU 0 : 0 CPU');
});

test('diagonal keyboard movement has the same speed as straight movement', () => {
  const { game } = createGame();
  const origin = game.inspect().player;
  game.update(.04, new Set(['right']));
  const straight = game.inspect().player.x - origin.x;
  game.reset();
  game.update(.04, new Set(['right', 'down']));
  const diagonal = game.inspect().player;
  assert.ok(Math.abs(Math.hypot(diagonal.x - origin.x, diagonal.y - origin.y) - straight) < .0001);
});

test('fast pointer moves stay speed limited and inside the player half', () => {
  const { game } = createGame();
  for (const [x, y] of [[-10000, -10000], [10000, 10000], [-10000, 10000], [10000, -10000]]) {
    game.reset();
    game.pointer(x, y);
    const origin = game.inspect().player;
    game.update(.04);
    let s = game.inspect();
    assert.ok(Math.hypot(s.player.x - origin.x, s.player.y - origin.y) <= 740 * .04 + .001);
    advance(game, .9);
    s = game.inspect();
    assert.ok(s.player.x >= s.rink.left + s.malletRadius && s.player.x <= 360 - s.malletRadius);
    assert.ok(s.player.y >= s.rink.top + s.malletRadius && s.player.y <= s.rink.bottom - s.malletRadius);
    assert.equal(s.player.x, x < 0 ? s.rink.left + s.malletRadius : 360 - s.malletRadius);
  }
});

test('release and keyboard input cancel a pending pointer move', () => {
  const { game } = createGame();
  game.pointer(330, 380); game.update(.02); game.releaseInput();
  const stopped = game.inspect().player;
  advance(game, .2);
  assert.equal(game.inspect().player.x, stopped.x);
  assert.equal(game.inspect().player.y, stopped.y);
  game.pointer(330, 380);
  game.update(.04, new Set(['left']));
  const keyboard = game.inspect().player;
  assert.ok(keyboard.x < stopped.x);
  game.update(.04);
  assert.equal(game.inspect().player.x, keyboard.x);
  game.pointer(NaN, Infinity); game.update(.04);
  assert.ok(Number.isFinite(game.inspect().player.x));
});

function steerPlayer(game, state, mode) {
  if (mode === 'idle') game.pointer(70, 70);
  else if (state.puck.x < 380) {
    const behind = state.player.x < state.puck.x - 12;
    game.pointer(state.puck.x + (behind ? 22 : -58),
      state.puck.y + (behind ? 0 : (state.puck.y < 225 ? 38 : -38)));
  } else game.pointer(100, 225 + (state.puck.y - 225) * .55);
}

for (const fps of [30, 60, 144]) for (const mode of ['idle', 'attacking']) {
  test(`${mode} player completes a valid first-to-seven match at ${fps} fps`, () => {
    const { game, events } = createGame();
    let state = game.inspect(), goals = 0, reflections = 0;
    for (let frame = 0; frame < fps * 240 && !state.ended; frame++) {
      const before = state;
      steerPlayer(game, state, mode);
      game.update(1 / fps);
      state = game.inspect();
      const { player, cpu, puck, rink, malletRadius, puckRadius } = state;
      for (const body of [player, cpu, puck]) {
        assert.ok([body.x, body.y, body.vx, body.vy].every(Number.isFinite));
      }
      assert.ok(player.x >= rink.left + malletRadius && player.x <= 360 - malletRadius);
      assert.ok(cpu.x >= 360 + malletRadius && cpu.x <= rink.right - malletRadius);
      for (const mallet of [player, cpu]) assert.ok(mallet.y >= rink.top + malletRadius && mallet.y <= rink.bottom - malletRadius);
      assert.ok(Math.hypot(puck.vx, puck.vy) <= 980.001);
      const nextGoals = state.playerPoints + state.cpuPoints;
      assert.ok(nextGoals === goals || nextGoals === goals + 1, 'one goal at most per update');
      if (nextGoals > goals) {
        const scoredRight = state.playerPoints > before.playerPoints;
        assert.ok(scoredRight ? before.puck.x > rink.right - 55 : before.puck.x < rink.left + 55,
          'a goal must originate at the correct goal line');
        assert.ok(before.puck.y > rink.goalTop - puckRadius && before.puck.y < rink.goalBottom + puckRadius,
          'a goal must pass through the goal opening');
        if (!state.ended) {
          assert.ok(state.serve > 0);
          assert.equal(puck.x, 360);
          assert.equal(puck.y, 225);
          assert.ok(scoredRight ? puck.vx > 0 : puck.vx < 0, 'serve goes to the conceding side');
        }
        goals = nextGoals;
      } else if (!state.serve) {
        assert.ok(puck.y >= rink.top + puckRadius - .001 && puck.y <= rink.bottom - puckRadius + .001);
        if (puck.y < rink.goalTop - puckRadius || puck.y > rink.goalBottom + puckRadius) {
          assert.ok(puck.x >= rink.left + puckRadius - .001 && puck.x <= rink.right - puckRadius + .001,
            'puck cannot pass through a closed rail');
        }
        if (before.puck.vy * puck.vy < 0) reflections++;
      }
    }
    assert.equal(state.ended, true, 'match should finish without a stuck puck');
    assert.equal(events.finishes.length, 1);
    assert.equal(events.finishes[0].won, mode === 'attacking');
    assert.equal(Math.max(state.playerPoints, state.cpuPoints), 7);
    assert.ok(reflections > 0, 'match includes rebounds');
    assert.equal(events.scores.at(-1), state.playerPoints);
    const frozen = JSON.stringify(state);
    advance(game, 2, new Set(['right']));
    assert.equal(JSON.stringify(game.inspect()), frozen, 'finished matches stop updating');
    game.reset();
    assert.equal(game.inspect().playerPoints + game.inspect().cpuPoints, 0);
    assert.equal(game.inspect().ended, false);
  });
}
