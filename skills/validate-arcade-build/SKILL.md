---
name: validate-arcade-build
description: Validate Pocket Arcade tests, its fresh Vite production build, and static hosting compatibility with ChatGPT Sites before release or on request.
---

# Validate the playable build

1. Work from the Pocket Arcade root. Read `package.json`, `vite.config.js`, and the hosting manifest (`.openai/hosting.json`) if present. Use a Node version matching `engines`. Install from the lockfile with `npm ci` when dependencies are missing or stale. On Windows, use `npm.cmd` if the PowerShell shim is blocked.
2. Run `npm test` and record the exit status and test counts. Run `npm run build` and capture its exit status. Diagnose failures and rerun affected checks after fixes within scope. A failed build leaves any previously generated files unsuitable as release evidence.
3. Compare Vite's effective output directory with `static.directory` when a hosting manifest is present. The release artifact is `build/` with a relative Vite base. Check the entry HTML, scripts, styles, and referenced local assets for missing files and development-server URLs. Account for inline data and external resources separately. For an existing-Site release, match the manifest ID to the requested destination. A newly cloned fork can pass local validation before it has its own Site.
4. For gameplay or UI changes, follow the installed Sites preview guidance for the current host. Exercise the production build on desktop and at a narrow touch viewport. Select the cartridge, start, move, score, pause/resume, restart, and switch back to another game. Check console errors and failed asset requests. Include changed features such as fullscreen, gesture cancellation, or saved preferences.
5. Report tests, build, static output checks, and browser checks separately. Give the first failing command or missing asset and identify any checks that could not run. Report hosted verification only when an actual Sites result is available. A validation-only request ends here.
