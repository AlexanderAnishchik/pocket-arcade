export function Icon({ name }) {
  return <svg aria-hidden="true" focusable="false"><use href={'#i-' + name} /></svg>;
}

export function IconDefinitions() {
  return (
    <svg className="icon-defs" aria-hidden="true">
      <defs>
        <symbol id="i-gamepad" viewBox="0 0 24 24"><path d="M7 7h10l4 12h-5l-2-3h-4l-2 3H3L7 7Z" /><path d="M8 10v5m-2.5-2.5h5M16 11h.01M18 14h.01" /></symbol>
        <symbol id="i-play" viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z" /></symbol>
        <symbol id="i-dpad-arrow" viewBox="0 0 24 24"><path d="m12 5 7 12H5Z" /></symbol>
        <symbol id="i-pause" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" /></symbol>
        <symbol id="i-restart" viewBox="0 0 24 24"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" /></symbol>
        <symbol id="i-sound" viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4ZM17 8q5 4 0 8" /></symbol>
        <symbol id="i-muted" viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4ZM17 9l5 6m0-6-5 6" /></symbol>
        <symbol id="i-expand" viewBox="0 0 24 24"><path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" /></symbol>
        <symbol id="i-collapse" viewBox="0 0 24 24"><path d="M4 9h5V4m6 0v5h5M9 20v-5H4m16 0h-5v5" /></symbol>
        <symbol id="i-star" viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" /></symbol>
      </defs>
    </svg>
  );
}
