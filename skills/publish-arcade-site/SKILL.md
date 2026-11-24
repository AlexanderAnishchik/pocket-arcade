---
name: publish-arcade-site
description: Publish a personal Pocket Arcade fork as an independent ChatGPT Site, or release an update to a specified existing Site. Use when the user requests publication.
---

# Publish an arcade

Use the installed Sites workflow and connected Sites tools. Determine the destination from the user's request. The [maintainer guide](../../docs/maintainers.md#release-targets) identifies the original demo and the Windows packaging setup.

## Choose the destination

- **First publication of a personal fork.** A Git fork inherits the demo's hosting manifest. Use the Sites new-project workflow in a separate empty project directory. Carry over the requested source, lockfile, configuration, project skills, license, and notices. Exclude the inherited hosting manifest, Git metadata, checkout-local runtime state, dependency and build directories, and local secrets. Register the new Site once, record its returned project ID in the destination manifest, and set its static directory to `build`. Use that destination checkout for subsequent releases.
- **Remix of the live demo.** When the user specifically wants the published version as their starting point, use the installed Sites remix workflow. It creates the destination identity. Apply any requested fork changes in the remix checkout.
- **Update to an existing edition.** Match the requested Site to the checkout's `.openai/hosting.json`. If a fork still points at the upstream demo and the request is for a personal edition, follow the first-publication path. If the intended existing Site is ambiguous, resolve its URL or ID before writing to it.

## Build and publish

1. Use the destination's returned source access, or obtain fresh access for that ID. For an existing Site, call `get_site` to confirm role and audience and open its source using the Sites helper. Supply credentials via hidden stdin. Reconcile the requested local changes in the helper's checkout while preserving any newer destination changes.
2. Follow [Validate Arcade Build](../validate-arcade-build/SKILL.md) on the exact source being released. For a redistributed fork, copy `LICENSE` and `NOTICE` from the source root into the finished `build/` directory before packaging. A GitHub push and a Sites release target separate repositories.
3. Use the helper to push the source and package the built files to an archive outside the checkout. Keep the helper's project ID, verified commit SHA, and archive together through the version save.
4. Follow the installed Sites skill for the destination's access mode. Preserve the audience of an existing Site unless the user asks to change it. For save-only requests, return the saved version. Otherwise deploy that version and follow its deployment until a terminal result. If a publish operation is already pending, resume it.
5. Report the destination URL and version from the successful result. For a first publication, identify the new checkout so future updates go to the same Site.
