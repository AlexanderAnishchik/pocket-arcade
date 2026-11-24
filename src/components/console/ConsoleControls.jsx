import { Icon } from '../Icon.jsx';

const directions = ['up', 'left', 'right', 'down'];

export function ConsoleControls({ view, actionButtonRef, actions }) {
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
            type="button"
            className={'d-' + dir + (heldDirections.includes(dir) ? ' held' : '')}
            data-dir={dir}
            aria-label={'Move ' + dir}
            onPointerDown={event => actions.pressDirection(event, dir)}
            onPointerUp={actions.releaseDirection}
            onPointerCancel={actions.releaseDirection}
            onLostPointerCapture={actions.releaseDirection}
            onClick={event => actions.clickDirection(event, dir)}
          >
            <Icon name="dpad-arrow" />
          </button>
        ))}
      </div>
      <div className="center-controls">
        <div className="small-buttons">
          <button id="restart" type="button" aria-label="Restart game" onClick={actions.restart}>
            <span><Icon name="restart" /></span>RESET
          </button>
          <button
            id="pause"
            type="button"
            aria-label={paused ? 'Resume game' : 'Pause game'}
            disabled={phase === 'ready' || phase === 'over'}
            onClick={actions.togglePause}
          >
            <span><Icon name={paused ? 'play' : 'pause'} /></span><b>{paused ? 'RESUME' : 'PAUSE'}</b>
          </button>
        </div>
        <span className="console-model">A LITTLE ESCAPE / MODEL 001</span>
      </div>
      <div className="action-control">
        <button
          id="action"
          type="button"
          ref={actionButtonRef}
          className={[shotHeld && 'held', charging && 'charging'].filter(Boolean).join(' ')}
          aria-label={shooting ? 'Hold to shoot, release to slide' : 'Start or pause game'}
          onPointerDown={actions.pressAction}
          onPointerUp={actions.releaseAction}
          onPointerCancel={actions.cancelAction}
          onLostPointerCapture={actions.cancelAction}
          onClick={actions.clickAction}
        >
          {shooting ? '●' : 'A'}
        </button>
        <span id="action-label">{actionLabel}</span>
      </div>
    </div>
  );
}
