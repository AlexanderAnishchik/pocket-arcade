---
name: create-arcade-game
description: Add a new playable cartridge to Pocket Arcade, including its engine, library card, controls, scoring, and regression tests.
---

# Create a Pocket Arcade game

1. Identify the player's objective, controls, score, and end condition from the brief. Use the closest existing game as a reference. Read the [game engine contract](../../docs/maintainers.md#game-engine-contract) and inspect the session input handlers.
2. Choose a stable ID for the factory export in `src/games.js` and the entry in `src/catalog.js`. Give the entry its next cartridge number, name, card text, color, mark, controls, and help. The picker and shelf count follow the catalog. Put custom cartridge art in `src/components/library/CartridgePicker.jsx` if needed. The catalog mark is the fallback. Check `index.html` and the README for game lists affected by the change.
3. Implement the factory with `(api, rng = Math.random)`, `reset()`, `update(dt, input)`, `draw(ctx)`, and `inspect()`. Use the 720 × 450 coordinate system, elapsed seconds, and the shared score, status, finish, and beep callbacks. Keep randomness injectable and state per instance. Leave DOM events, timers, preferences, and the animation loop in `src/session.js`.
4. Reuse the console controls. Trace actual keyboard, pointer, touch, and D-pad dispatch through `src/session.js` and `src/components/console/ConsoleControls.jsx`. Wire new actions only when gameplay needs them. Clear held input on interruption. Preserve ordinary keyboard activation of focused buttons.
5. Add deterministic tests for the defining rule, scoring boundary, end condition, and reset. The catalog-wide React test selects and starts each game. Cover any new input path through the UI. For movement-sensitive mechanics, exercise multiple frame rates. Follow [Validate Arcade Build](../validate-arcade-build/SKILL.md) before handoff.
