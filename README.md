# Pocket Arcade — Codex project guide

A browser-based retro console with original Snake, Pong, Breakout, and Air Hockey games.

## Project and deployment identity

- **Live Site:** https://pocket-arcade-alex-8bit.activegiant65.chatgpt.site
- **Sites project ID:** `appgprj_6ad22f71c3c88191a7ed556e66311441`
- **Source branch:** `main` (use the branch returned by Sites repository access if it changes).
- **Hosting manifest:** `.openai/hosting.json`
- **Static directory:** `dist`

This repository is already connected to the existing Pocket Arcade Site. Reuse its project ID. Do not call `create_site`, create another Site, replace the manifest identity, or change sharing to deploy an update. Always read the current access configuration before choosing a deployment tool. The Site was public when last checked on 28 October 2026; preserve its current audience.

For Codex: run project commands with this directory as the explicit `workdir`. If a chat is still attached to the old generated workspace under Documents, do not edit an old copy there. If access to D: is blocked by the execution sandbox, request the appropriate filesystem permission or use the host's approved escalation flow; do not misdiagnose a sandbox Git error as repository corruption.

## Source layout

```text
arcade-game/
├── .git/                 Git history and Sites source repository configuration
├── .openai/
│   └── hosting.json      Existing Site identity and static hosting configuration
├── dist/
│   ├── index.html       Console, game selection, overlays, buttons, SVG icons
│   ├── styles.css       Responsive console styling and fullscreen presentation
│   ├── app.js           Input, game lifecycle, sound, preferences, fullscreen
│   └── games.js         Snake, Pong, Breakout, Air Hockey engines and canvas rendering
└── README.md            This guide
```

`dist` is the hand-written application source and the published static directory. It is not generated output. There is no package installation, framework, bundler, or build step. The hosted version loads Google Fonts; system font fallbacks are defined.

## Local development

From PowerShell:

```powershell
Set-Location -LiteralPath 'D:\Study\arcade-game'
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4173. Keep the server running while testing, and stop it with Ctrl+C afterward. If `python` is unavailable, use the Python executable returned by Codex's `load_workspace_dependencies` tool. Local preview may require network permission in a sandbox.

Syntax checks, using Node.js or the bundled Node executable:

```powershell
node --check dist/app.js
node --check dist/games.js
```

Air Hockey has a dependency-free regression suite using Node's built-in test runner:

```powershell
node --test tests/airhockey.test.cjs
```

It checks movement, pointer release, rink boundaries, and complete winning/losing matches at 30, 60, and 144 fps. Also verify affected behavior in the browser. Do not add a test framework for small presentation changes.

## Application conventions

- Preserve the cream console, dark screen, cartridge colors, pixel-inspired graphics, and responsive layout.
- Game selection, scores, best scores, start, pause, restart, sound, touch controls, and fullscreen are coordinated in `app.js`.
- Best scores and preferences use browser-local storage with the `pocket-arcade-` prefix. No backend database is required.
- Sound defaults to on when there is no saved preference. A saved off preference is respected. Audio is unlocked by a player interaction; do not rely on page-load autoplay.
- Keep the labeled **Full screen** button above the game inside `#display`. It changes to **Exit full screen** through `fullscreenchange`, including when the browser exits fullscreen. Unsupported browsers hide the toolbar.
- Arrow keys or WASD move; Enter starts/resumes; Space or P pauses/resumes; Escape pauses; R restarts. Buttons remain keyboard accessible.
- Mobile players can use the D-pad, swipe Snake, drag the Pong/Breakout paddle, or drag the Air Hockey mallet in two dimensions.
- Air Hockey is a first-to-seven match against the CPU. The mint player mallet stays in the left half; the coral CPU mallet stays in the right half. Arrow keys/WASD, mouse movement, touch drag, and the D-pad move the mallet. A goal counts when the entire puck crosses the goal line. A short face-off follows each goal; best scores store goals scored in a match.
- Pause on focus loss or when the page becomes hidden. Preserve scores and state on pause; restart deliberately resets the round.

### Game engine boundary

`games.js` defines `window.RetroGames` with `snake`, `pong`, `breakout`, and `airhockey`. Each game exposes `create(api)`, returning `reset()`, `update(dt, input)`, `draw(ctx)`, directional/action/pointer handlers, and `inspect()` for inspection. The optional `releaseInput()` clears a pointer target when a drag ends or the game changes phase.

The shared canvas coordinates are **720 × 450**. `dt` is seconds. Input is a set of held `left`, `right`, `up`, and `down` directions. The app supplies `score(number)`, `status(string)`, `finish(won, message)`, and `beep(frequency, duration, type)` callbacks. Keep game engines free of DOM event listeners and independent timers; the app owns the animation loop.

## Deploy updates to the existing GPT Site

Use the installed **Sites** skill and connected Sites tools. Read its current `SKILL.md` before deploying; installed plugin versions and tool schemas can change. These steps document the workflow successfully used for this project, not a replacement for current tool instructions.

### 1. Inspect and open the existing source

1. Read `.openai/hosting.json` and check `git status --short`. Preserve unrelated edits.
2. Call Sites `get_site` with the exact project ID above. Check the current audience and role.
3. Call `create_source_repository_write_credential` for that same ID.
4. Run the installed `scripts/site-workflow.mjs --project-id <project_id>` from this repository in a retained terminal session (`tty: true`). After its hidden-input prompt, send `{ "credential": <returned credential object> }` through `write_stdin`. Omit `archivePath` for opening.
5. Wait for a successful exit. Retain the complete returned opening result, including `checkout_path` and `commit_sha`, in session memory. Use its checkout path for edits and pass the result as `source` when packaging.

Do not put credentials in this README, source files, environment files, command arguments, Git URLs, logs, or shell history. Pass the complete returned access object through stdin only. `work_proxy` access has no token: do not invent an authentication header for it. If access expires, obtain fresh repository access for the same Site.

### 2. Windows helper setup

Use the current installed Sites plugin root. The version used to verify this workflow was:

```text
C:\Users\oanis\.codex\plugins\cache\openai-curated-remote\sites\1.1.2
```

Obtain runtime executable paths with `load_workspace_dependencies` when needed. Before launching the helper, prepend **Git for Windows Bash** and the selected Node directory to PATH. Windows' default `bash.exe` may invoke WSL and fail to open the helper's Windows paths. `TAR_OPTIONS` avoids tar treating a drive letter as a remote archive host.

Example setup; adjust executable/plugin paths to their installed locations:

```powershell
$arcadeRepo = 'D:\Study\arcade-game'
$sitesPluginRoot = 'C:\Users\oanis\.codex\plugins\cache\openai-curated-remote\sites\1.1.2'
$sitesNode = 'C:\Users\oanis\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$env:PATH = 'C:\Program Files\Git\bin;' + (Split-Path -Parent $sitesNode) + ';' + $env:PATH
$env:TAR_OPTIONS = '--force-local'
Set-Location -LiteralPath $arcadeRepo
& $sitesNode (Join-Path $sitesPluginRoot 'scripts\site-workflow.mjs') --project-id appgprj_6ad22f71c3c88191a7ed556e66311441
```

The helper waits for hidden JSON on stdin. In Codex, deliver it with `write_stdin`, not by embedding a token in a PowerShell command. On this Windows PTY, terminating the payload with `\r` (Enter) worked; a lone `\n` previously left the process waiting.

### 3. Implement, verify, package

1. Make the requested changes in `dist/` and run appropriate checks.
2. For UI changes, follow the Sites skill's local preview instructions. Confirm the local server responds before opening it. Check desktop and narrow/mobile layouts; test any behavior you changed. For fullscreen changes, check enter, exit, keyboard activation, and label synchronization.
3. Launch the source helper again from the returned checkout path with the same Windows environment setup.
4. After the hidden-input prompt, send this payload using actual in-memory objects:

```javascript
{
  credential: repositoryAccess,
  source: openingResult,
  commands: [],
  archivePath: "D:/Study/arcade-game-deploy.tar.gz"
}
```

`commands: []` is appropriate when applicable checks have already passed and inputs have not changed. Otherwise provide remaining checks as ordered argument arrays. No build is required for this static app. Keep the archive outside the repository so it cannot be committed accidentally.

The helper owns source staging, commit/push, and archive packaging. Wait for successful completion and retain its exact `project_id`, `commit_sha`, and `archive` values. Do not modify the archive or source between packaging and saving the version.

### 4. Save and publish

Select the deployment flow using the audience returned by `get_site`:

- **Public or shared:** call `save_site_version` with the helper's exact project ID, commit SHA, and archive path. Then call `deploy_site_version` with the returned saved version ID.
- **Confirmed owner-private:** use `save_version_and_deploy_private` when available, or the separate save/private-deploy flow defined by the current Sites skill.

Never use a project ID as a saved-version ID. Never deploy an unpushed source state. Never change sharing simply to make deployment work.

If publication returns a nonterminal status, call `get_deployment_status` with its exact deployment ID until it succeeds or fails. A successful deployment result with its URL confirms publication; do not keep polling a terminal result. If a failed operation already returned `saved_version_id`, retain and deploy that version rather than creating a duplicate.

Open the returned live URL in Codex and report the change, relevant validation, and any remaining limits. Reuse the existing Site URL. A documentation-only edit does not change the playable app; include the README in the next source synchronization when publishing application changes.

## Useful checks before finishing an app update

Choose the checks relevant to the change:

- Each affected game starts, moves, scores, ends, and restarts correctly.
- Pause/resume preserves the current game; switching games creates a fresh round.
- Keyboard shortcuts do not block ordinary activation of focused buttons.
- Touch controls and screen gestures work without horizontal overflow.
- Best scores and explicit sound preferences survive reload.
- Fullscreen remains discoverable and has a visible exit control.
- Browser errors are resolved and the deployed version matches the packaged source.
