## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## llms.txt / llms-full.txt

`llms.txt` and `llms-full.txt` are generated automatically by the `docusaurus-plugin-llms` plugin on
every `npm run build`, into `build/` (gitignored) — there is no source file to hand-edit. They are only
as current as the **deployed** site, which is built by Cloudflare Pages from `origin/main`, not from local
`HEAD`.

Whenever you change anything under `docs/` (guides, API reference, migration notes) or otherwise change
content that would show up in these files:
- Run `npm run build` afterward and skim the generated `build/llms.txt` / `build/llms-full.txt` for the
  section you touched, to confirm the change actually landed there as expected.
- Remember the fix isn't live until it's both **committed and pushed** — commit as usual, and if the
  local branch is ahead of `origin/main`, say so and ask before pushing (per this project's normal git
  discipline). A docs fix sitting only in local commits means the live `llms.txt`/`llms-full.txt` (and the
  site itself) are still serving the old content.
- If asked to verify `llms.txt` is "up to date," check it against the **live** URL
  (`https://www.postgrejs.com/llms.txt` / `.../llms-full.txt`), not just the local build — the two can
  disagree whenever local commits haven't been pushed yet.
