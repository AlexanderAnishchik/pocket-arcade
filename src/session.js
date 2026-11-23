import { catalog } from './catalog.js';
import * as games from './games.js';

const storagePrefix = 'pocket-arcade-';
const keyMap = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
};
const normalizeKey = key => key.length === 1 ? key.toLowerCase() : key;
const interactive = 'button,a,input,textarea,select';

export function readPreference(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(storagePrefix + key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function savePreference(key, value) {
  try {
    localStorage.setItem(storagePrefix + key, JSON.stringify(value));
  } catch {
    // Play remains available when storage is disabled.
  }
}

export function createSession({ canvas, display, dialog, actionButton, publish }) {
  const ctx = canvas.getContext('2d');
  const savedBests = readPreference('bests', {});
  const bests = Object.fromEntries(Object.keys(catalog).map(id => {
    const value = savedBests?.[id];
    return [id, Number.isFinite(value) && value >= 0 ? value : 0];
  }));
  const keysDown = new Set();
  const directionPointers = new Map();
  let active = 'snake';
  let phase = 'ready';
  let game;
  let currentScore = 0;
  let soundOn = readPreference('sound', true) === true;
  let crtOn = readPreference('crt', true) !== false;
  let audioContext;
  let shotSource = null;
  let drag = null;
  let dirty = true;
  let last = performance.now();
  let frameId;

  function unlockAudio() {
    if (!soundOn) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    } catch {
      // Audio is optional.
    }
  }

  function beep(freq = 440, duration = .08, type = 'square') {
    if (!soundOn || !audioContext) return;
    try {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(.025, now);
      gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(now);
      osc.stop(now + duration + .01);
    } catch {
      // Audio is optional.
    }
  }

  function score(value) {
    currentScore = value;
    if (value > bests[active]) {
      bests[active] = value;
      savePreference('bests', bests);
    }
    publish({ score: value, best: bests[active] });
  }

  function announce(announcement) {
    publish({ announcement });
  }

  function beginShot(source, buttonHeld = false) {
    if (phase !== 'running' || shotSource !== null || !game.beginShot?.()) return false;
    shotSource = source;
    publish({ shotHeld: buttonHeld });
    unlockAudio();
    return true;
  }

  function endShot(fire) {
    if (shotSource === null) return;
    shotSource = null;
    publish({ shotHeld: false });
    if (fire && phase === 'running') game.releaseShot?.();
    else game.releaseInput?.();
  }

  function setPhase(value, result = null) {
    endShot(false);
    phase = value;
    keysDown.clear();
    directionPointers.clear();
    drag = null;
    game.releaseInput?.();
    dirty = true;
    last = performance.now();
    publish({ phase, result, heldDirections: [] });
  }

  function finish(won, message) {
    setPhase('over', { won, message });
    announce((won ? 'You won! ' : 'Game over. ') + message + ' Score ' + currentScore);
  }

  function select(id) {
    endShot(false);
    game?.releaseInput?.();
    active = id;
    publish({ active, shot: null });
    game = games[id]({
      score,
      status: status => publish({ status }),
      finish,
      beep,
      shot: shot => publish({ shot }),
    });
    game.reset();
    setPhase('ready');
    announce(catalog[id].name + ' selected. Press Enter to start.');
  }

  const focusCanvas = () => canvas.focus({ preventScroll: true });

  function start() {
    unlockAudio();
    if (phase !== 'paused') game.reset();
    setPhase('running');
    beep(520, .07);
    focusCanvas();
  }

  function pause() {
    if (phase !== 'running') return;
    setPhase('paused');
    announce('Game paused.');
  }

  function toggle() {
    if (phase === 'running') pause();
    else start();
  }

  function restart() {
    unlockAudio();
    game.reset();
    setPhase('running');
    focusCanvas();
    beep(330, .08);
    announce('New ' + catalog[active].name + ' game.');
  }

  function keyDown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || dialog.open) return;
    const key = normalizeKey(event.key);
    const dir = Object.hasOwn(keyMap, key) ? keyMap[key] : undefined;
    const onAction = event.target === actionButton;
    const focusedControl = event.target.closest?.(interactive);
    if (active === 'shuffleboard' && phase === 'running' &&
        (key === ' ' || (key === 'Enter' && onAction)) &&
        (onAction || !focusedControl)) {
      event.preventDefault();
      if (!event.repeat) beginShot('key:' + key, onAction);
      return;
    }
    if (dir) {
      event.preventDefault();
      keysDown.add(key);
      if (phase === 'running' && !event.repeat) game.direction?.(dir);
      return;
    }
    if (event.repeat) return;
    if (key === 'Enter' && !focusedControl) {
      event.preventDefault();
      if (phase !== 'running') start();
    } else if (key === 'p' || (key === ' ' && !focusedControl)) {
      event.preventDefault();
      if (phase === 'running') pause();
      else if (phase === 'paused' || key === ' ') start();
    } else if (key === 'Escape' && phase === 'running') {
      event.preventDefault();
      pause();
    } else if (key === 'r') {
      event.preventDefault();
      restart();
    }
  }

  function keyUp(event) {
    const key = normalizeKey(event.key);
    if (shotSource === 'key:' + key) {
      event.preventDefault();
      endShot(true);
    }
    keysDown.delete(key);
  }

  function actionPointerDown(event) {
    if (active !== 'shuffleboard' || phase !== 'running' || event.button !== 0) return;
    event.preventDefault();
    if (beginShot('pointer:' + event.pointerId, true)) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  }

  function releaseAction(event, fire) {
    if (shotSource === 'pointer:' + event.pointerId) endShot(fire);
  }

  function clickAction(event) {
    if (active !== 'shuffleboard' || phase !== 'running') {
      toggle();
    } else if (event.detail === 0) {
      // Assistive clicks can toggle charging. Keys and pointers use hold/release.
      if (shotSource === 'click') endShot(true);
      else beginShot('click', true);
    }
  }

  function directionDown(event, dir) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    directionPointers.set(event.pointerId, dir);
    publish({ heldDirections: [...directionPointers.values()] });
    if (phase === 'running') game.direction?.(dir);
  }

  function releaseDirection(event) {
    if (directionPointers.delete(event.pointerId)) {
      publish({ heldDirections: [...directionPointers.values()] });
    }
  }

  function clickDirection(event, dir) {
    if (event.detail === 0 && phase === 'running') game.direction?.(dir);
  }

  function aim(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    if (scale <= 0) return;
    const x = (event.clientX - rect.left - (rect.width - canvas.width * scale) / 2) / scale;
    const y = (event.clientY - rect.top - (rect.height - canvas.height * scale) / 2) / scale;
    game.pointer?.(x, y);
  }

  function canvasDown(event) {
    if (phase !== 'running' || drag) return;
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    if (active !== 'snake') aim(event);
  }

  function canvasMove(event) {
    if (phase !== 'running' || (drag && event.pointerId !== drag.id)) return;
    if (active === 'snake' && drag) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) <= 18) return;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const dir = horizontal ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      game.direction?.(dir);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    } else if (active !== 'snake' && (drag || (event.pointerType === 'mouse' && active !== 'shuffleboard'))) {
      aim(event);
    }
  }

  function releaseCanvas(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    if (game.releasePointer) game.releasePointer();
    else game.releaseInput?.();
  }

  function clearInput() {
    if (phase === 'running') {
      pause();
    } else {
      keysDown.clear();
      directionPointers.clear();
      drag = null;
      publish({ heldDirections: [] });
    }
  }

  function visibilityChange() {
    if (document.hidden) clearInput();
  }

  function syncFullscreen() {
    publish({ expanded: document.fullscreenElement === display });
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === display) await document.exitFullscreen();
      else await display.requestFullscreen();
      if (phase === 'running') focusCanvas();
    } catch {
      announce('Fullscreen is unavailable in this preview. You can keep playing here.');
    }
  }

  function frame(time) {
    const dt = Math.min(.04, Math.max(0, (time - last) / 1000));
    last = time;
    if (phase === 'running') {
      const input = new Set([...Array.from(keysDown, key => keyMap[key]), ...directionPointers.values()]);
      game.update(dt, input);
      dirty = true;
    }
    if (dirty && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      game.draw(ctx);
      dirty = false;
    }
    frameId = requestAnimationFrame(frame);
  }

  const listeners = [
    [document, 'keydown', keyDown],
    [document, 'keyup', keyUp],
    [window, 'blur', clearInput],
    [document, 'visibilitychange', visibilityChange],
    [document, 'fullscreenchange', syncFullscreen],
  ];
  for (const [target, type, handler] of listeners) target.addEventListener(type, handler);
  publish({ soundOn, crtOn, fullscreenEnabled: Boolean(document.fullscreenEnabled) });
  syncFullscreen();
  select('snake');
  frameId = requestAnimationFrame(frame);

  return {
    select(id) {
      select(id);
      focusCanvas();
    },
    start, toggle, restart, toggleFullscreen,
    actionPointerDown, releaseAction, clickAction,
    directionDown, releaseDirection, clickDirection,
    canvasDown, canvasMove, releaseCanvas,
    toggleSound() {
      soundOn = !soundOn;
      savePreference('sound', soundOn);
      publish({ soundOn });
      unlockAudio();
      beep(660, .1);
    },
    toggleCrt() {
      crtOn = !crtOn;
      savePreference('crt', crtOn);
      publish({ crtOn });
    },
    openHelp() {
      pause();
      dialog.showModal();
    },
    dispose() {
      for (const [target, type, handler] of listeners) target.removeEventListener(type, handler);
      cancelAnimationFrame(frameId);
      audioContext?.close().catch(() => {});
    },
  };
}
