## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## llms.txt / llms-full.txt

`llms.txt` and `llms-full.txt` are generated automatically by the `docusaurus-plugin-llms` plugin on
every `pnpm build`, into `build/` (gitignored) — there is no source file to hand-edit. They are only
as current as the **deployed** site, which is built by Cloudflare Pages from `origin/main`, not from local
`HEAD`.

Whenever you change anything under `docs/` (guides, API reference, migration notes) or otherwise change
content that would show up in these files:
- Run `pnpm build` afterward and skim the generated `build/llms.txt` / `build/llms-full.txt` for the
  section you touched, to confirm the change actually landed there as expected.
- Remember the fix isn't live until it's both **committed and pushed** — commit as usual, and if the
  local branch is ahead of `origin/main`, say so and ask before pushing (per this project's normal git
  discipline). A docs fix sitting only in local commits means the live `llms.txt`/`llms-full.txt` (and the
  site itself) are still serving the old content.
- If asked to verify `llms.txt` is "up to date," check it against the **live** URL
  (`https://www.postgrejs.com/llms.txt` / `.../llms-full.txt`), not just the local build — the two can
  disagree whenever local commits haven't been pushed yet.

## Package manager and the pre-push routine

This repo uses **pnpm** (`packageManager` in `package.json`, lockfile `pnpm-lock.yaml`). Do not use npm
or yarn here, and do not recreate `package-lock.json`. `pnpm-workspace.yaml` sets `minimumReleaseAge: 0`,
which turns off pnpm's default 24-hour hold on newly published versions (the default is 1440 minutes);
leave it at 0. pnpm does not read that setting from `.npmrc`.

Before every push, in this order, stopping at the first failure:

1. `rman deps` — lists dependencies that have a newer version. A lookup that errors ("the registry gave
   no answer") is not "up to date": rerun until it answers.
2. If there are updates, `rman deps -u` to apply them. It leaves exact pins alone (`typescript` is pinned
   on purpose) and only moves `^`/`~` ranges.
3. `rman ci` — deletes `node_modules` and the lockfile, then reinstalls from scratch.
4. Check: `pnpm typecheck` and `pnpm build`, and skim the build output for new errors or warnings. Per the
   llms.txt section above, check `build/llms.txt` when `docs/` changed.
5. Test: this repo has no test suite, so the build plus a look at the pages the change touched
   (`pnpm start`, or `pnpm serve` after the build) is the test.
6. Push — still only after the user has asked for it, or after asking, as described above. If steps 2–3
   changed `package.json` or `pnpm-lock.yaml`, commit them first, separately from the content change.
