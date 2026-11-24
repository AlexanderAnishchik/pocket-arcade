import { catalog } from './catalog.js';
import { ArcadeConsole } from './components/console/ArcadeConsole.jsx';
import { HelpDialog } from './components/console/HelpDialog.jsx';
import { GameLibrary } from './components/library/GameLibrary.jsx';
import { Icon, IconDefinitions } from './components/Icon.jsx';
import { useArcadeSession } from './hooks/useArcadeSession.js';

export function App() {
  const { view, actions, canvasRef, displayRef, consoleRef, dialogRef, actionButtonRef } = useArcadeSession();
  const item = catalog[view.active];
  const shuffleboard = view.active === 'shuffleboard';
  const pauseKey = shuffleboard ? 'P' : 'SPACE';

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
            <ArcadeConsole
              view={view}
              item={item}
              actions={actions}
              ref={consoleRef}
              displayRef={displayRef}
              canvasRef={canvasRef}
              actionButtonRef={actionButtonRef}
            />
            <GameLibrary
              active={view.active}
              item={item}
              pauseKey={pauseKey}
              soundOn={view.soundOn}
              onSelect={actions.selectGame}
              onSound={actions.toggleSound}
              onHelp={actions.openHelp}
            />
          </div>
          <div className="under-console">
            <span><span className="live-dot" /> ALL PLAY. NO PAY.</span>
            <span><kbd>{pauseKey}</kbd> pause <span className="shortcut-divider">/</span> <kbd>R</kbd> restart</span>
            <button id="crt" type="button" aria-pressed={view.crtOn} onClick={actions.toggleCrt}>
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
      <HelpDialog ref={dialogRef} item={item} shuffleboard={shuffleboard} />
      <div id="announcement" className="sr-only" aria-live="polite">{view.announcement}</div>
    </div>
  );
}
