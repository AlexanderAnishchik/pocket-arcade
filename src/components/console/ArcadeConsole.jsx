import { Display } from './Display.jsx';
import { ConsoleControls } from './ConsoleControls.jsx';

function preventBrowserGesture(event) {
  event.preventDefault();
}

export function ArcadeConsole({ ref, view, item, actions, displayRef, canvasRef, actionButtonRef }) {
  return (
    <section
      className="console"
      ref={ref}
      aria-label="Retro gaming console"
      onContextMenu={preventBrowserGesture}
      onDragStart={preventBrowserGesture}
    >
      <span className="screw screw-tl" aria-hidden="true" /><span className="screw screw-tr" aria-hidden="true" />
      <div className="console-top">
        <span className="console-wordmark">POCKET<span> ARCADE</span></span>
        <div className="power-label"><span /> POWER <b>01</b></div>
      </div>
      <Display view={view} item={item} canvasRef={canvasRef} displayRef={displayRef} actions={actions} />
      <ConsoleControls view={view} actionButtonRef={actionButtonRef} actions={actions} />
      <span className="screw screw-bl" aria-hidden="true" /><span className="screw screw-br" aria-hidden="true" />
    </section>
  );
}
