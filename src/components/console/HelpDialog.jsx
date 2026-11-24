import { useId } from 'react';

export function HelpDialog({ ref: dialogRef, item, shuffleboard }) {
  const titleId = useId();
  const descriptionId = useId();
  const close = () => dialogRef.current.close();

  function dismissBackdrop(event) {
    if (event.target !== event.currentTarget) return;
    // A click on the dialog's padding has the same target as a backdrop click.
    const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = event;
    if (clientX < left || clientX > right || clientY < top || clientY > bottom) close();
  }

  return (
    <dialog
      id="help-dialog"
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={dismissBackdrop}
    >
      <button id="close-help" type="button" className="close-help" aria-label="Close instructions" onClick={close}>×</button>
      <span className="eyebrow">THE VERY SHORT MANUAL</span>
      <h2 id={titleId}>How to play {item.name}</h2>
      <p id={descriptionId}>{item.help}</p>
      <dl>
        <div><dt>Move / shoot</dt><dd>{item.move}</dd></div>
        <div><dt>Start / resume</dt><dd>Enter or the A button</dd></div>
        <div><dt>Pause</dt><dd>{shuffleboard ? 'P, Escape, or PAUSE' : 'Space, P, or Escape'}</dd></div>
        <div><dt>Restart</dt><dd>R or RESET</dd></div>
      </dl>
      <p className="dialog-note">Switching games starts a fresh round. Best scores stay saved on this device.</p>
      <button id="help-done" type="button" className="start-button" onClick={close}>Got it. Let's play.</button>
    </dialog>
  );
}
