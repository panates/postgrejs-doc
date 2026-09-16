# Documentation Sync Tracking

This file records which commit of the **source repository** (`postgrejs`) the content in this
documentation site was last verified against — for the main guides/API reference, and separately
for the benchmarks page, since that gets regenerated on its own, faster cadence.

**Update this file every time you do a documentation pass against the source**, whether that's a
full content review or just re-copying the benchmarks report. Future sessions should read this
file first, then diff the source repo from the recorded commit to `HEAD` to see exactly what
changed before touching any page — not re-read the whole source from scratch.

## Main documentation (guides, API reference, migration notes)

| Field | Value |
|---|---|
| Source repo path | `/Users/ehanoglu/dev/oslib/postgrejs` |
| Source remote | `https://github.com/panates/postgrejs.git` |
| Source branch | `dev` |
| Source commit | `dd22acfff83dfeb263d9c4c31429eee0e55e18aa` |
| Source commit (short) | `dd22acf` |
| Source commit date | 2026-09-16T17:16:51+03:00 |
| Source `package.json` version | 3.4.0 (unreleased additions on top of the tagged 3.4.0 — see CHANGELOG note below) |
| This repo's commit at sync time | _(fill in after committing this sync)_ |
| Synced at | _(fill in after committing)_ |
| Synced by | Claude Code session — reviewed the diff since `62faa88`. Three new features, all verified against a real server: **automatic prepared-statement caching** for `query()`/`execute()` (new "Automatic Statement Caching" section in `guides/extended-query.md`, `prepare`/`preparedStatementCacheSize` added to `database-connection-params.md`, `prepare` added to `query-options.md`, cross-linked from `prepared-statements.md`); **`Connection.pipeline()`** for many different statements under one `Sync` (new "Multi-Statement Pipelines" section in `extended-query.md`, method added to `api/classes/connection.md`, distinguished explicitly from `Pool`'s unrelated opt-in pipelining); **`copyFromRows()`** for binary-encoded bulk loading from JS rows (new section in `guides/copy.md`, method on `connection.md`, new `api/interfaces/copy-from-rows-options.md`). Also: renamed `DatabaseError.batchIndex` → `failedIndex` in our own docs to match a source rename that landed before the field was ever published; documented a numeric-encoding correctness fix (garbage into an int/numeric parameter now throws instead of silently storing 0) in `query-parameters.md`, including a self-caught inaccuracy in the first draft of that example (plain `{}` doesn't reach the encoder at all without an explicit `BindParam` — PostgreSQL's own type mismatch fires first); synced `getting-started/features.md`'s Prepared Statements/Bulk Import/Query Pipelining bullets and added Multi-statement round trip / Binary COPY encoding rows to the Feature Comparison table, matching the README's own catch-up. No navbar version bump — still v3.4.0. |

**To check what's changed in the source since this was recorded:**

```bash
cd /Users/ehanoglu/dev/oslib/postgrejs
git fetch origin
git log --oneline dd22acfff83dfeb263d9c4c31429eee0e55e18aa..origin/dev -- src/ README.md CHANGELOG.md
git diff dd22acfff83dfeb263d9c4c31429eee0e55e18aa..origin/dev -- src/ README.md CHANGELOG.md
```

Review the diff for: new/removed exports (need new/removed API reference pages), changed method
signatures or option defaults (need corrections in the relevant guide + API page), new README
feature-list or feature-comparison-table entries (need a new guide page + homepage update), and
any `CHANGELOG.md` entries not yet reflected in `docs/migration-from-v2.md` or the guides.

## Benchmarks pages (`docs/getting-started/benchmarks.md` + `benchmarks-bun.md`)

Copied close to verbatim from the source repo's `doc/BENCHMARKS.md` (Node) and `doc/BENCHMARKS-bun.md`
(Bun, added in the 3.3.0 sync) and regenerated independently of the rest of the docs (a different run of
`npm run bench:report`/`bench:bun` doesn't imply any API/feature change) — track both separately from the
main documentation.

| Field | Value |
|---|---|
| Source files | `/Users/ehanoglu/dev/oslib/postgrejs/doc/BENCHMARKS.md` (Node), `doc/BENCHMARKS-bun.md` (Bun) |
| Source commit at last copy | `dd22acfff83dfeb263d9c4c31429eee0e55e18aa` |
| Node run date (from the report itself) | 2026-09-16T14:14:05.530Z |
| Bun run date (from the report itself) | 2026-09-16T14:14:05.559Z |
| Library versions in that run | PostgreJS 3.4.0, pg 8.23.0, postgres 3.4.9, Bun.sql 1.3.10 (Bun report only) |
| This repo's commit at sync time | _(fill in after committing this sync)_ |
| Synced at | _(fill in after committing)_ |

**To check for a newer report:**

```bash
grep -n "Run date" /Users/ehanoglu/dev/oslib/postgrejs/doc/BENCHMARKS.md /Users/ehanoglu/dev/oslib/postgrejs/doc/BENCHMARKS-bun.md
```

If either run date is newer than the ones recorded above, re-copy that file and reapply the MDX
compatibility fixes (raw HTML `style="..."` → JSX `style={{...}}` object, a blank line after every
`</div>`/`</table>`, `<tbody>` if the layout ever goes back to `<table>`, the relative
`benchmark/README.md` link → an absolute GitHub URL, and the frontmatter/H1 title swap) — see this repo's
commit history around `8078037`, `5c70288`, `944f298`, and the 3.3.0 sync commit for exactly what those
fixes looked like each time the report's own HTML layout changed.

## Navbar version badge

`docusaurus.config.ts`'s navbar has a hardcoded `v3.4.0` badge (linking to npm) — it is **not**
read dynamically from the source repo's `package.json` (that path only exists on this machine,
not on the Cloudflare Pages build image), so update it by hand alongside the main documentation
sync whenever the source's version changes.

## Updating this file

After any sync, replace the relevant table's values with the new source commit hash
(`git -C /Users/ehanoglu/dev/oslib/postgrejs rev-parse HEAD`), this repo's own new commit hash once
you've committed the doc changes, and the current UTC timestamp
(`date -u +"%Y-%m-%dT%H:%M:%SZ"`).
