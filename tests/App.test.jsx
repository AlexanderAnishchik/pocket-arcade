// @vitest-environment jsdom

import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/App.jsx';

let frames;
let time;

function renderArcade() {
  return render(<StrictMode><App /></StrictMode>);
}

function select(name) {
  const group = screen.getByRole('group', { name: 'Select a game' });
  const cartridge = within(group).getByRole('button', { name });
  fireEvent.click(cartridge);
  return cartridge;
}

function advance(count) {
  act(() => {
    for (let i = 0; i < count; i++) {
      time += 1000 / 60;
      const pending = [...frames.values()];
      frames.clear();
      for (const frame of pending) frame(time);
    }
  });
}

function pointer(target, type, pointerId) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 });
  Object.defineProperty(event, 'pointerId', { value: pointerId });
  fireEvent(target, event);
}

beforeEach(() => {
  localStorage.clear();
  frames = new Map();
  time = 0;
  let nextId = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => time);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('requestAnimationFrame', callback => {
    frames.set(++nextId, callback);
    return nextId;
  });
  vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('selects a cartridge, starts, pauses, resumes and restarts via the console', () => {
  renderArcade();
  const pause = screen.getByRole('button', { name: 'Pause game' });
  expect(pause.disabled).toBe(true);

  const pong = select(/Pong/);
  const canvas = screen.getByLabelText(/^Pong game/);
  expect(pong.getAttribute('aria-pressed')).toBe('true');
  expect(document.activeElement).toBe(canvas);
  fireEvent.keyDown(canvas, { key: 'Enter' });
  expect(canvas.dataset.phase).toBe('running');

  fireEvent.click(pause);
  expect(screen.getByRole('heading', { name: 'PAUSED' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
  expect(canvas.dataset.phase).toBe('running');
  fireEvent.click(screen.getByRole('button', { name: 'Restart game' }));
  expect(screen.getByText('New Pong game.')).toBeTruthy();
  expect(screen.getByText('YOU 0 : 0 CPU')).toBeTruthy();
});

test('a saved score and explicit sound and CRT preferences survive remounting', () => {
  localStorage.setItem('pocket-arcade-bests', JSON.stringify({ snake: 42, breakout: 90 }));
  const { unmount } = renderArcade();
  expect(screen.getByText('0042')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Sound on' }));
  fireEvent.click(screen.getByRole('button', { name: 'CRT effect ON' }));
  unmount();
  renderArcade();

  expect(screen.getByRole('button', { name: 'Sound off' }).getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByRole('button', { name: 'CRT effect OFF' }).getAttribute('aria-pressed')).toBe('false');
  select(/Breakout/);
  expect(screen.getByText('0090')).toBeTruthy();
});

test('awards and persists a Snake best score after eating', () => {
  vi.spyOn(Math, 'random').mockReturnValue(231.5 / 472);
  const { container } = renderArcade();
  fireEvent.click(screen.getByRole('button', { name: "Let's play" }));
  advance(26);

  expect(container.querySelector('#score').textContent).toBe('0010');
  expect(container.querySelector('#best').textContent).toBe('0010');
  expect(JSON.parse(localStorage.getItem('pocket-arcade-bests')).snake).toBe(10);
});

test('Shuffleboard cancels a charge on blur and shoots on a subsequent Space release', () => {
  renderArcade();
  select(/Shuffleboard/);
  fireEvent.click(screen.getByRole('button', { name: "Let's play" }));
  const canvas = screen.getByLabelText(/^Shuffleboard game/);

  fireEvent.keyDown(canvas, { key: ' ' });
  advance(30);
  expect(screen.getByText(/RELEASE · [1-9]\d*%/)).toBeTruthy();
  fireEvent.blur(window);
  fireEvent.keyUp(canvas, { key: ' ' });
  expect(canvas.dataset.phase).toBe('paused');

  fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
  fireEvent.keyDown(canvas, { key: ' ' });
  advance(30);
  expect(screen.getByText(/RELEASE · [1-9]\d*%/)).toBeTruthy();
  fireEvent.keyUp(canvas, { key: ' ' });
  expect(screen.getByText('HOLD / RELEASE')).toBeTruthy();
  fireEvent.keyDown(canvas, { key: ' ' });
  expect(screen.queryByText(/RELEASE ·/)).toBeNull();
});

test('Shuffleboard keeps a shot held when a different pointer releases its aiming drag', () => {
  renderArcade();
  select(/Shuffleboard/);
  fireEvent.click(screen.getByRole('button', { name: "Let's play" }));
  const canvas = screen.getByLabelText(/^Shuffleboard game/);
  const action = screen.getByRole('button', { name: /Hold to shoot/ });

  pointer(action, 'pointerdown', 1);
  pointer(canvas, 'pointerdown', 2);
  pointer(canvas, 'pointerup', 2);
  expect(action.classList.contains('charging')).toBe(true);
  pointer(action, 'pointercancel', 1);
  expect(action.classList.contains('charging')).toBe(false);

  pointer(action, 'pointerdown', 3);
  expect(action.classList.contains('charging')).toBe(true);
  pointer(action, 'pointerup', 3);
  expect(action.classList.contains('charging')).toBe(false);
});

test('unmount cancels animation and detaches keyboard listeners under Strict Mode', () => {
  const { unmount } = renderArcade();
  expect(frames.size).toBe(1);
  unmount();
  expect(frames.size).toBe(0);

  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  document.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
});

test('fullscreen controls follow entry and browser-initiated exit events', () => {
  const enabled = Object.getOwnPropertyDescriptor(document, 'fullscreenEnabled');
  const element = Object.getOwnPropertyDescriptor(document, 'fullscreenElement');
  let fullscreenElement = null;
  Object.defineProperties(document, {
    fullscreenEnabled: { configurable: true, value: true },
    fullscreenElement: { configurable: true, get: () => fullscreenElement },
  });

  try {
    const { container } = renderArcade();
    const display = container.querySelector('#display');
    display.requestFullscreen = vi.fn(async () => {
      fullscreenElement = display;
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    expect(display.requestFullscreen).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Exit full screen' })).toBeTruthy();

    fullscreenElement = null;
    fireEvent(document, new Event('fullscreenchange'));
    expect(screen.getByRole('button', { name: 'Full screen' })).toBeTruthy();
  } finally {
    if (enabled) Object.defineProperty(document, 'fullscreenEnabled', enabled);
    else delete document.fullscreenEnabled;
    if (element) Object.defineProperty(document, 'fullscreenElement', element);
    else delete document.fullscreenElement;
  }
});

test('Snake ends with a replay overlay and starts a clean round when replayed', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  renderArcade();
  fireEvent.click(screen.getByRole('button', { name: "Let's play" }));
  advance(200);

  expect(screen.getByRole('heading', { name: 'GAME OVER' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Pause game' }).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
  expect(screen.getByLabelText(/^Snake game/).dataset.phase).toBe('running');
});
