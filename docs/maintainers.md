# Pocket Arcade maintainer guide

## Source map

| Area | Entry point |
| --- | --- |
| React root and page composition | [main.jsx](../src/main.jsx), [App.jsx](../src/App.jsx) |
| Mount and dispose the game session | [useArcadeSession.js](../src/hooks/useArcadeSession.js) |
| Canvas, overlay, help, and console controls | [Console components](../src/components/console/) |
| Cartridge cards, artwork, and quick guide | [Library components](../src/components/library/) |
| Cartridge metadata and game engines | [catalog.js](../src/catalog.js), [games.js](../src/games.js) |
| Input, time, audio, and persistence | [session.js](../src/session.js) |
| Responsive and fullscreen layouts | [styles.css](../src/styles.css) |
| Game rules and React interaction tests | [tests](../tests/) |

## Application conventions

- Preserve the cream console, dark screen, cartridge colors, pixel-inspired graphics, and responsive layout.
- Game selection, scores, best scores, start, pause, restart, sound, touch controls, and fullscreen are coordinated by the React UI and `src/session.js`.
- Best scores and preferences use browser-local storage with the `pocket-arcade-` prefix. No backend database is required.
- Sound defaults to on when there is no saved preference. A saved off preference is respected. Audio is unlocked by a player interaction; do not rely on page-load autoplay.
- Keep the labeled **Full screen** button above the game inside `#display`. It changes to **Exit full screen** through `fullscreenchange`, including when the browser exits fullscreen. Unsupported browsers hide the toolbar.
- Arrow keys or WASD move; Enter starts/resumes; Space or P pauses/resumes; Escape pauses; R restarts. In Shuffleboard, hold Space to charge and release to shoot; P or Escape pauses. Buttons remain keyboard accessible.
- Mobile players can use the D-pad, swipe Snake, drag the Pong/Breakout paddle, or drag the Air Hockey mallet in two dimensions.
- Air Hockey is a first-to-seven match against the CPU. The mint player mallet stays in the left half; the coral CPU mallet stays in the right half. Arrow keys/WASD, mouse movement, touch drag, and the D-pad move the mallet. A goal counts when the entire puck crosses the goal line. A short face-off follows each goal; best scores store goals scored in a match.
- Shuffleboard is a three-round match against the CPU with four pucks each per round, alternating turns and alternating who goes first each round. Aim using arrows/WASD, the D-pad, or a drag on the table. Hold Space or the round console action button, then release to launch. A longer hold increases distance; power reaches its maximum after 1.65 seconds and stays there until release. Shots include small random strength variations and gentle drift. Direction spread increases with power: softer shots are more accurate and stronger shots are less predictable. The dotted path is an estimate. Pucks collide and can fall off any edge. All fully supported pucks score 1, 2, or 3 at round end; the entire puck must cross a line to earn the higher value. Short shots and overhanging/off-table pucks score zero. Tied totals after round three trigger additional rounds until someone wins. Best scores store the player's total points. Fullscreen uses Space to shoot and arrows or dragging to aim.
- Canceling a pointer, pausing, switching games, or losing focus cancels an unfinished Shuffleboard charge without spending a puck. Releasing an aiming drag does not cancel a shot being charged with another finger. Keyboard users can hold Space or Enter while a shot button is focused; assistive clicks can start and finish a charge with two activations.
- Pause on focus loss or when the page becomes hidden. Preserve scores and state on pause; restart deliberately resets the round.

## Game engine contract

`src/games.js` exports `snake`, `pong`, `breakout`, `airhockey`, and `shuffleboard`. Each factory accepts `(api, rng = Math.random)` and returns `reset()`, `update(dt, input)`, `draw(ctx)`, applicable directional/action/pointer handlers, and `inspect()` for inspection. The optional `releaseInput()` clears pending input when the game changes phase. A drag ending calls `releasePointer()` when supplied, otherwise `releaseInput()`. Shuffleboard exposes `beginShot()` and `releaseShot()` and reports button state through the optional `api.shot({ canShoot, charging, power, label })` callback. Its `releaseInput()` cancels a charge without firing.

The shared canvas coordinates are **720 × 450**. `dt` is seconds. Input is a set of held `left`, `right`, `up`, and `down` directions. The app supplies `score(number)`, `status(string)`, `finish(won, message)`, and `beep(frequency, duration, type)` callbacks. Keep game engines free of DOM event listeners and independent timers; the app owns the animation loop.

## Release targets

The original public demo is [Pocket Arcade](https://pocket-arcade-alex-8bit.activegiant65.chatgpt.site). Its Sites project ID is `appgprj_6ad22f71c3c88191a7ed556e66311441`. A Git fork initially inherits this ID in `.openai/hosting.json`. A personal edition needs its own Sites project, source checkout, and URL. The [publishing skill](../skills/publish-arcade-site/SKILL.md) covers first publication and later updates.

For an existing deployment, use the branch and checkout returned by Sites. Validate that exact source, build with Vite, then package the generated `build/` directory. Keep deployment archives outside the source tree. For a redistributed copy, include the repository’s [license](../LICENSE) and [notice](../NOTICE) with the distributed files. Preserve third-party licenses.

### Windows packaging

Run the installed Sites source helper from the intended checkout. Put Git for Windows Bash on PATH and configure tar to treat drive-letter paths as local files.

```powershell
$env:PATH = 'C:\Program Files\Git\bin;' + $env:PATH
$env:TAR_OPTIONS = '--force-local'
```

Use the helper from the currently installed Sites plugin. Supply the credential object through its hidden stdin prompt. The opening call returns the source checkout. The packaging call accepts that opening result, an absolute archive path, and any remaining build commands. Save the version from the exact pushed commit and archive, then deploy the returned version ID for the intended audience. For a pending deployment, wait for its terminal result before reporting a live URL.
