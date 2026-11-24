import { useEffect, useRef, useState } from 'react';
import { initialGameId } from '../catalog.js';
import { createSession } from '../session.js';

const initialView = {
  active: initialGameId,
  phase: 'ready',
  status: '',
  score: 0,
  best: 0,
  soundOn: true,
  crtOn: true,
  fullscreenEnabled: false,
  expanded: false,
  heldDirections: [],
  shot: null,
  shotHeld: false,
  result: null,
  announcement: '',
};

export function useArcadeSession() {
  const canvasRef = useRef(null);
  const displayRef = useRef(null);
  const consoleRef = useRef(null);
  const dialogRef = useRef(null);
  const actionButtonRef = useRef(null);
  const sessionRef = useRef(null);
  const [view, setView] = useState(initialView);

  useEffect(() => {
    // The session draws every frame. React only receives updates for visible game state.
    const session = createSession({
      canvas: canvasRef.current,
      display: displayRef.current,
      dialog: dialogRef.current,
      actionButton: actionButtonRef.current,
      publish: patch => setView(previous => (
        Object.keys(patch).every(key => Object.is(previous[key], patch[key]))
          ? previous
          : { ...previous, ...patch }
      )),
    });
    sessionRef.current = session;

    // Long presses can select text on touchscreens while the player holds a control.
    const surface = consoleRef.current;
    const preventSelection = event => event.preventDefault();
    surface.addEventListener('selectstart', preventSelection);

    return () => {
      sessionRef.current = null;
      session.dispose();
      surface.removeEventListener('selectstart', preventSelection);
    };
  }, []);

  const actions = {
    selectGame: id => sessionRef.current?.select(id),
    start: () => sessionRef.current?.start(),
    togglePause: () => sessionRef.current?.toggle(),
    restart: () => sessionRef.current?.restart(),
    toggleFullscreen: () => sessionRef.current?.toggleFullscreen(),
    toggleSound: () => sessionRef.current?.toggleSound(),
    toggleCrt: () => sessionRef.current?.toggleCrt(),
    openHelp: () => sessionRef.current?.openHelp(),
    pressAction: event => sessionRef.current?.actionPointerDown(event),
    releaseAction: event => sessionRef.current?.releaseAction(event, true),
    cancelAction: event => sessionRef.current?.releaseAction(event, false),
    clickAction: event => sessionRef.current?.clickAction(event),
    pressDirection: (event, direction) => sessionRef.current?.directionDown(event, direction),
    releaseDirection: event => sessionRef.current?.releaseDirection(event),
    clickDirection: (event, direction) => sessionRef.current?.clickDirection(event, direction),
    pressCanvas: event => sessionRef.current?.canvasDown(event),
    moveCanvas: event => sessionRef.current?.canvasMove(event),
    releaseCanvas: event => sessionRef.current?.releaseCanvas(event),
  };

  return { view, actions, canvasRef, displayRef, consoleRef, dialogRef, actionButtonRef };
}
