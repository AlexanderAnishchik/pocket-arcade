import { Icon } from '../Icon.jsx';

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

export function Display({ view, item, canvasRef, displayRef, actions }) {
  const overlay = overlayFor(item, view);
  const { active, best, crtOn, expanded, fullscreenEnabled, phase, score, status } = view;

  return (
    <div className="bezel" id="display" ref={displayRef}>
      <div className="display-toolbar" id="display-toolbar" hidden={!fullscreenEnabled}>
        <span id="fullscreen-hint">{expanded ? 'Your arcade, expanded' : 'More room to play'}</span>
        <button
          id="fullscreen"
          type="button"
          title={expanded ? 'Return to the console' : 'Play in full screen'}
          onClick={actions.toggleFullscreen}
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
          ref={canvasRef}
          width={720}
          height={450}
          tabIndex={0}
          aria-label={item.name + ' game. ' + item.move + '.'}
          data-game={active}
          data-phase={phase}
          onPointerDown={actions.pressCanvas}
          onPointerMove={actions.moveCanvas}
          onPointerUp={actions.releaseCanvas}
          onPointerCancel={actions.releaseCanvas}
          onLostPointerCapture={actions.releaseCanvas}
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
              <button id="start" type="button" className="start-button" onClick={actions.start}>
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
