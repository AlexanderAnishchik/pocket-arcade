import { catalog } from '../../catalog.js';
import { Icon } from '../Icon.jsx';
import { CartridgePicker } from './CartridgePicker.jsx';

const gameCount = Object.keys(catalog).length;
const gameCountLabel = `${String(gameCount).padStart(2, '0')} ${gameCount === 1 ? 'GAME' : 'GAMES'}`;

export function GameLibrary({ active, item, pauseKey, soundOn, onSelect, onSound, onHelp }) {
  const [before, key, after] = item.keyText;
  return (
    <aside className="library" aria-label="Game library">
      <div className="library-heading">
        <h2>Pick your pixel fix.</h2>
        <span>{gameCountLabel}</span>
      </div>
      <CartridgePicker active={active} onSelect={onSelect} />
      <div className="sound-settings">
        <button className="sound-button" id="sound" type="button" aria-pressed={soundOn} onClick={onSound}>
          <Icon name={soundOn ? 'sound' : 'muted'} /><span>Sound {soundOn ? 'on' : 'off'}</span>
        </button>
      </div>
      <div className="quick-guide">
        <div className="guide-heading">
          <span>THE QUICK HOW-TO</span>
          <button id="help" type="button" aria-label="Open game instructions" aria-haspopup="dialog" onClick={onHelp}>?</button>
        </div>
        <p id="game-instructions">{item.instructions}</p>
        <div id="control-hint" className="control-hint">
          <span className="key-cluster">{item.keys.map(key => <kbd key={key}>{key}</kbd>)}</span>
          <span>{before}<b>{key}</b>{after}</span>
        </div>
        <div className="control-hint pause-hint"><kbd>{pauseKey}</kbd><span>to pause / resume</span></div>
        <div className="touch-hint">{item.touch}</div>
      </div>
      <div className="save-note">
        <Icon name="star" />
        <span>Little victories, remembered.<br /><b>Your best scores save on this device.</b></span>
      </div>
    </aside>
  );
}
