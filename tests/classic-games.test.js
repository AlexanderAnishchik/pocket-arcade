import { expect, test, vi } from 'vitest';
import { breakout, pong, snake } from '../src/games.js';

function create(factory, rng = () => .5) {
  const api = { score: vi.fn(), status: vi.fn(), finish: vi.fn() };
  const game = factory(api, rng);
  game.reset();
  return { game, api };
}

function advance(game, seconds, input) {
  for (let frame = 0; frame < seconds * 120; frame++) game.update(1 / 120, input);
}

test('Snake rejects reverse turns, grows when eating, and ends at a wall', () => {
  const { game, api } = create(snake, () => 231.5 / 472);
  game.direction('left');
  advance(game, .42);
  expect(game.inspect()).toMatchObject({ heading: 'right', score: 10 });
  expect(game.inspect().body).toHaveLength(5);
  expect(api.score).toHaveBeenLastCalledWith(10);

  advance(game, 3);
  expect(api.finish).toHaveBeenCalledTimes(1);
  expect(api.finish).toHaveBeenCalledWith(false, expect.any(String));
});

test('Pong awards a point after a missed return and ends the match at five', () => {
  const { game, api } = create(pong);
  advance(game, 2.1, new Set(['up']));
  expect(game.inspect()).toMatchObject({ playerPoints: 0, cpuPoints: 1, ended: false });

  advance(game, 10);
  expect(game.inspect()).toMatchObject({ playerPoints: 0, cpuPoints: 5, ended: true });
  expect(api.finish).toHaveBeenCalledExactlyOnceWith(false, expect.any(String));
});

test('Breakout scores for clearing a brick and restores lives, bricks and score on reset', () => {
  const { game, api } = create(breakout);
  expect(game.inspect().bricks).toHaveLength(40);
  advance(game, 2);
  expect(game.inspect().bricks.filter(brick => brick.alive)).toHaveLength(39);
  expect(api.score).toHaveBeenLastCalledWith(10);

  advance(game, 1);
  expect(game.inspect().lives).toBe(2);
  game.reset();
  expect(game.inspect()).toMatchObject({ lives: 3, score: 0, ended: false });
  expect(game.inspect().bricks.every(brick => brick.alive)).toBe(true);
});
