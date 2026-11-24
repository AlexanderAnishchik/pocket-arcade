import { catalog } from '../../catalog.js';

const artwork = {
  snake: (
    <svg viewBox="0 0 80 68">
      <path d="M15 45V24h29v22h17V34" fill="none" stroke="currentColor" strokeWidth="10" />
      <rect x="54" y="29" width="14" height="13" fill="currentColor" />
      <rect x="61" y="31" width="3" height="3" fill="#254738" />
      <rect x="17" y="50" width="7" height="7" fill="#eeab6b" />
    </svg>
  ),
  pong: (
    <svg viewBox="0 0 80 68">
      <path d="M40 8v52" stroke="currentColor" strokeWidth="2" strokeDasharray="4 5" opacity=".3" />
      <path d="M15 13v23M65 32v23" stroke="currentColor" strokeWidth="6" />
      <rect x="27" y="36" width="7" height="7" fill="currentColor" />
    </svg>
  ),
  breakout: (
    <svg viewBox="0 0 80 68">
      <path d="M8 14h17m6 0h17m6 0h17M8 25h17m6 0h17m6 0h17" stroke="currentColor" strokeWidth="8" />
      <path d="M30 57h22" stroke="currentColor" strokeWidth="5" />
      <rect x="47" y="40" width="5" height="5" fill="#fff0d3" />
    </svg>
  ),
  airhockey: (
    <svg viewBox="0 0 80 68">
      <path d="M8 26V10h64v16M8 42v16h64V42M40 10v48" fill="none" stroke="currentColor" strokeWidth="2" opacity=".5" />
      <circle cx="40" cy="34" r="12" fill="none" stroke="currentColor" strokeWidth="2" opacity=".3" />
      <circle cx="21" cy="39" r="9" fill="currentColor" />
      <circle cx="21" cy="39" r="4" fill="#254844" />
      <circle cx="59" cy="27" r="9" fill="#ed9b85" />
      <circle cx="59" cy="27" r="4" fill="#754a40" />
      <circle cx="40" cy="39" r="4" fill="#fff0c9" />
    </svg>
  ),
  shuffleboard: (
    <svg viewBox="0 0 80 68">
      <path d="M7 16h66v37H7z" fill="currentColor" opacity=".18" />
      <path d="M46 16v37m10-37v37m10-37v37" stroke="currentColor" strokeWidth="2" opacity=".55" />
      <path d="M15 36h21" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
      <circle cx="24" cy="36" r="7" fill="#88e6dc" />
      <circle cx="60" cy="32" r="7" fill="#ed9b85" />
    </svg>
  ),
};

export function CartridgePicker({ active, onSelect }) {
  return (
    <div className="cartridges" role="group" aria-label="Select a game">
      {Object.entries(catalog).map(([id, game]) => (
        <button
          key={id}
          type="button"
          className={id === active ? 'cartridge selected' : 'cartridge'}
          data-game={id}
          aria-pressed={id === active}
          onClick={() => onSelect(id)}
        >
          <span className={'cartridge-art ' + id + '-art'} aria-hidden="true">{artwork[id] ?? game.mark}</span>
          <span className="cartridge-info">
            <small>{game.number} / {game.subtitle}</small>
            <strong>{game.name}</strong>
            <span>{game.description}</span>
          </span>
          <span className="cart-indicator">↗</span>
          <span className="inserted-label">NOW INSERTED</span>
        </button>
      ))}
    </div>
  );
}
