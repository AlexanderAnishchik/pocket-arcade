# Working on Pocket Arcade

Read [AGENTS.md](AGENTS.md) to choose a project skill. The [README](README.md) covers setup and personal forks. The [maintainer guide](docs/maintainers.md) covers controls, the engine contract, and release targets.

## Where changes belong

- Compose the page in `src/App.jsx`. Keep console controls, display, and help in `src/components/console/`. Keep the cartridge picker and library in `src/components/library/`. Share icons through `src/components/Icon.jsx`.
- Mount React in `src/main.jsx`. Keep DOM refs and session setup in `src/hooks/useArcadeSession.js`. The hook calls the session's disposer on unmount so React Strict Mode remounts leave one animation loop and one set of listeners.
- Route input, sound, storage, and phase transitions through `src/session.js`. Game engines in `src/games.js` own rules and canvas drawing. Keep frame-by-frame simulation out of React state.
- Register each game in `src/catalog.js` and export its engine under the same ID in `src/games.js`. The library renders its cards and count from the catalog. Preserve cartridge IDs and existing storage keys so saved preferences and best scores continue to work.
- Give each control an accessible name and preserve keyboard, pointer, and touch behavior. When changing held input, check release, pointer cancellation, blur, pause, and switching cartridges.
- Bind controls to named actions so readers can trace them from JSX to the session. Use short comments to explain browser quirks, gameplay tradeoffs, or cleanup that would be easy to miss.

## Use the existing skills

1. For a new game, follow [Create Arcade Game](skills/create-arcade-game/SKILL.md) to connect its engine, cartridge, instructions, and tests.
2. For a UI or gameplay change, follow [Validate Arcade Build](skills/validate-arcade-build/SKILL.md). Run `npm.cmd test` and `npm.cmd run build` on Windows. Exercise changed interactions in the production preview at desktop and narrow touch sizes. Put component behavior tests in `tests/App.test.jsx` and game-rule tests alongside the engine suites in `tests/`.
3. When publishing is requested, follow [Publish Arcade Site](skills/publish-arcade-site/SKILL.md) and the installed Sites skill. A personal fork needs its own Sites project. For an update, match the requested destination to the checkout's hosting manifest. Supply release credentials through the workflow’s hidden input.

When moving an entry point, update the README and any skill that references its path. For external contributions, follow [CONTRIBUTING.md](CONTRIBUTING.md).
