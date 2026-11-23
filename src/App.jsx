import { useEffect, useRef, useState } from 'react';
import { catalog } from './catalog.js';
import { GameLibrary } from './GameLibrary.jsx';
import { Icon, IconDefinitions } from './Icon.jsx';
import { createSession, readPreference } from './session.js';

const directions = ['up', 'left', 'right', 'down'];
const stateLabels = {
  ready: 'READY WHEN YOU ARE',
  running: 'A LITTLE ESCAPE IN PROGRESS',
  paused: 'TAKE A BREATHER',
  over: 'THERE’S ALWAYS ONE MORE GAME',
};
const formatScore = value => String(Math.floor(value)).padStart(4, '0');

function overlayFor(item, { phase, result, score }) {
  if (phase === 'running') return null;
  if (phase === 'paused') return {
    kicker: 'NO RUSH / YOUR GAME IS SAFE',
    title: 'PAUSED',
    copy: 'Take your time.\nYour pixels can wait.',
    label: 'Keep playing',
    hint: 'OR PRESS ENTER / SPACE',
  };
  if (phase === 'over') return {
    kicker: result.won ? 'A LITTLE VICTORY / WELL PLAYED' : 'THAT WAS A GOOD RUN',
    title: result.won ? 'NICE WORK!' : 'GAME OVER',
    copy: result.message + '\nFinal score: ' + score,
    label: 'Play again',
    hint: 'OR PRESS ENTER',
  };
  return {
    kicker: 'CARTRIDGE ' + item.number + ' / READY TO PLAY',
    title: item.name.toUpperCase(),
    copy: item.tagline,
    label: "Let's play",
    hint: 'OR PRESS ENTER',
  };
}

function HelpDialog({ dialog, item, shuffleboard }) {
  const close = () => dialog.current.close();

  function dismissBackdrop(event) {
    if (event.target !== event.currentTarget) return;
    const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = event;
    if (clientX < left || clientX > right || clientY < top || clientY > bottom) close();
  }

  return (
    <dialog id="help-dialog" ref={dialog} aria-labelledby="help-title" onClick={dismissBackdrop}>
      <button id="close-help" className="close-help" aria-label="Close instructions" onClick={close}>×</button>
      <span className="eyebrow">THE VERY SHORT MANUAL</span>
      <h2 id="help-title">How to play {item.name}</h2>
      <p id="help-copy">{item.help}</p>
      <dl>
        <div><dt>Move / shoot</dt><dd>{item.move}</dd></div>
        <div><dt>Start / resume</dt><dd>Enter or the A button</dd></div>
        <div><dt>Pause</dt><dd>{shuffleboard ? 'P, Escape, or PAUSE' : 'Space, P, or Escape'}</dd></div>
        <div><dt>Restart</dt><dd>R or RESET</dd></div>
      </dl>
      <p className="dialog-note">Switching games starts a fresh round. Best scores stay saved on this device.</p>
      <button id="help-done" className="start-button" onClick={close}>Got it. Let's play.</button>
    </dialog>
  );
}

function Display({ view, item, canvas, display, run }) {
  const overlay = overlayFor(item, view);
  const { active, best, crtOn, expanded, fullscreenEnabled, phase, score, status } = view;

  return (
    <div className="bezel" id="display" ref={display}>
      <div className="display-toolbar" id="display-toolbar" hidden={!fullscreenEnabled}>
        <span id="fullscreen-hint">{expanded ? 'Your arcade, expanded' : 'More room to play'}</span>
        <button
          id="fullscreen"
          type="button"
          title={expanded ? 'Return to the console' : 'Play in full screen'}
          onClick={run('toggleFullscreen')}
        >
          <Icon name={expanded ? 'collapse' : 'expand'} />
          <span>{expanded ? 'Exit full screen' : 'Full screen'}</span>
        </button>
      </div>
      <div className="screen-hud">
        <div><span>SCORE</span><strong id="score">{formatScore(score)}</strong></div>
        <div className="hud-game"><span id="game-name">{item.name.toUpperCase()}</span><small id="game-status">{status}</small></div>
        <div className="best-hud"><span>BEST</span><strong id="best">{formatScore(best)}</strong></div>
      </div>
      <div className="screen-wrap">
        <canvas
          id="game"
          ref={canvas}
          width={720}
          height={450}
          tabIndex={0}
          aria-label={item.name + ' game. ' + item.move + '.'}
          data-game={active}
          data-phase={phase}
          onPointerDown={run('canvasDown')}
          onPointerMove={run('canvasMove')}
          onPointerUp={run('releaseCanvas')}
          onPointerCancel={run('releaseCanvas')}
          onLostPointerCapture={run('releaseCanvas')}
        >
          Your browser needs canvas support to play these games.
        </canvas>
        <div className={crtOn ? 'scanlines' : 'scanlines off'} aria-hidden="true" />
        <div className="game-overlay" id="overlay" hidden={!overlay}>
          {overlay && (
            <div className="overlay-content">
              <span className="overlay-kicker">{overlay.kicker}</span>
              <div className="pixel-mark" aria-hidden="true">{item.mark}</div>
              <h2>{overlay.title}</h2>
              <p>{overlay.copy}</p>
              <button id="start" className="start-button" onClick={run('start')}>
                <Icon name="play" /><span>{overlay.label}</span>
              </button>
              <span className="start-hint">{overlay.hint}</span>
            </div>
          )}
        </div>
      </div>
      <div className="screen-bottom"><span><i id="state-led" />{stateLabels[phase]}</span></div>
    </div>
  );
}

function ConsoleControls({ view, actionButton, run }) {
  const { active, heldDirections, phase, shot, shotHeld } = view;
  const shooting = active === 'shuffleboard' && phase === 'running';
  const charging = shooting && shot?.charging;
  const paused = phase === 'paused';
  let actionLabel = shooting ? 'HOLD / RELEASE' : 'START / PAUSE';
  if (charging) actionLabel = 'RELEASE · ' + shot.power + '%';

  return (
    <div className="console-controls">
      <div className="dpad" role="group" aria-label="Directional controls">
        <span className="dpad-center" aria-hidden="true" />
        {directions.map(dir => (
          <button
            key={dir}
            className={'d-' + dir + (heldDirections.includes(dir) ? ' held' : '')}
            data-dir={dir}
            aria-label={'Move ' + dir}
            onPointerDown={run('directionDown', dir)}
            onPointerUp={run('releaseDirection')}
            onPointerCancel={run('releaseDirection')}
            onLostPointerCapture={run('releaseDirection')}
            onClick={run('clickDirection', dir)}
          >
            <Icon name="dpad-arrow" />
          </button>
        ))}
      </div>
      <div className="center-controls">
        <div className="small-buttons">
          <button id="restart" aria-label="Restart game" onClick={run('restart')}>
            <span><Icon name="restart" /></span>RESET
          </button>
          <button
            id="pause"
            aria-label={paused ? 'Resume game' : 'Pause game'}
            disabled={phase === 'ready' || phase === 'over'}
            onClick={run('toggle')}
          >
            <span><Icon name={paused ? 'play' : 'pause'} /></span><b>{paused ? 'RESUME' : 'PAUSE'}</b>
          </button>
        </div>
        <span className="console-model">A LITTLE ESCAPE / MODEL 001</span>
      </div>
      <div className="action-control">
        <button
          id="action"
          ref={actionButton}
          className={[shotHeld && 'held', charging && 'charging'].filter(Boolean).join(' ')}
          aria-label={shooting ? 'Hold to shoot, release to slide' : 'Start or pause game'}
          onPointerDown={run('actionPointerDown')}
          onPointerUp={run('releaseAction', true)}
          onPointerCancel={run('releaseAction', false)}
          onLostPointerCapture={run('releaseAction', false)}
          onClick={run('clickAction')}
        >
          {shooting ? '●' : 'A'}
        </button>
        <span id="action-label">{actionLabel}</span>
      </div>
    </div>
  );
}

export function App() {
  const canvas = useRef(null);
  const display = useRef(null);
  const consoleSurface = useRef(null);
  const dialog = useRef(null);
  const actionButton = useRef(null);
  const session = useRef(null);
  const [view, setView] = useState(() => ({
    active: 'snake',
    phase: 'ready',
    status: 'SPEED 01',
    score: 0,
    best: 0,
    soundOn: readPreference('sound', true) === true,
    crtOn: readPreference('crt', true) !== false,
    fullscreenEnabled: Boolean(document.fullscreenEnabled),
    expanded: false,
    heldDirections: [],
    shot: null,
    shotHeld: false,
    result: null,
    announcement: '',
  }));

  useEffect(() => {
    const surface = consoleSurface.current;
    const preventSelection = event => event.preventDefault();
    surface.addEventListener('selectstart', preventSelection);
    const arcade = createSession({
      canvas: canvas.current,
      display: display.current,
      dialog: dialog.current,
      actionButton: actionButton.current,
      publish: patch => setView(previous => (
        Object.keys(patch).every(key => Object.is(previous[key], patch[key]))
          ? previous
          : { ...previous, ...patch }
      )),
    });
    session.current = arcade;
    return () => {
      session.current = null;
      arcade.dispose();
      surface.removeEventListener('selectstart', preventSelection);
    };
  }, []);

  const run = (method, ...args) => event => session.current?.[method](event, ...args);
  const item = catalog[view.active];
  const shuffleboard = view.active === 'shuffleboard';
  const pauseKey = shuffleboard ? 'P' : 'SPACE';
  const preventConsoleSelection = event => event.preventDefault();

  return (
    <div style={{ '--accent': item.color }}>
      <IconDefinitions />
      <div className="page">
        <header className="site-header">
          <a className="brand" href="./" aria-label="Pocket Arcade home">
            <span className="brand-icon"><Icon name="gamepad" /></span>
            pocket<span className="brand-light">arcade</span><span className="brand-dot">®</span>
          </a>
          <h1 className="header-title" id="page-title">Small games. <span>Big nostalgia.</span></h1>
        </header>
        <main>
          <div className="intro">
            <div className="eyebrow"><span className="tiny-spark">✳</span> YOUR FIVE-MINUTE HAPPY PLACE</div>
            <p>Nothing to download. Nowhere to be.<br /> Pick a cartridge. Make some pixels move.</p>
          </div>
          <div className="arcade-layout">
            <section
              className="console"
              ref={consoleSurface}
              aria-label="Retro gaming console"
              onContextMenu={preventConsoleSelection}
              onDragStart={preventConsoleSelection}
            >
              <span className="screw screw-tl" aria-hidden="true" /><span className="screw screw-tr" aria-hidden="true" />
              <div className="console-top">
                <span className="console-wordmark">POCKET<span> ARCADE</span></span>
                <div className="power-label"><span /> POWER <b>01</b></div>
              </div>
              <Display view={view} item={item} canvas={canvas} display={display} run={run} />
              <ConsoleControls view={view} actionButton={actionButton} run={run} />
              <span className="screw screw-bl" aria-hidden="true" /><span className="screw screw-br" aria-hidden="true" />
            </section>
            <GameLibrary
              active={view.active}
              item={item}
              pauseKey={pauseKey}
              soundOn={view.soundOn}
              onSelect={id => session.current?.select(id)}
              onSound={run('toggleSound')}
              onHelp={run('openHelp')}
            />
          </div>
          <div className="under-console">
            <span><span className="live-dot" /> ALL PLAY. NO PAY.</span>
            <span><kbd>{pauseKey}</kbd> pause <span className="shortcut-divider">/</span> <kbd>R</kbd> restart</span>
            <button id="crt" aria-pressed={view.crtOn} onClick={run('toggleCrt')}>
              CRT effect <b>{view.crtOn ? 'ON' : 'OFF'}</b>
            </button>
          </div>
        </main>
        <footer>
          <span>MADE FOR THE JOY OF IT.</span>
          <span>One more game? <span className="footer-star">✳</span> Thought so.</span>
          <span>EST. 2026 · 8-BIT AT HEART</span>
        </footer>
      </div>
      <HelpDialog dialog={dialog} item={item} shuffleboard={shuffleboard} />
      <div id="announcement" className="sr-only" aria-live="polite">{view.announcement}</div>
    </div>
  );
}
