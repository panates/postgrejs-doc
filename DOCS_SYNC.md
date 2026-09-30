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
| Source commit | `6c09694b4da3dab891bd9ec66100fe990d2bdce5` |
| Source commit (short) | `6c09694` |
| Source commit date | 2026-09-29T19:45:20+03:00 |
| Source `package.json` version | 3.12.1 |
| This repo's commit at sync time | `bbdf5a4` |
| Synced at | 2026-09-30T06:16:45Z |
| Synced by | Claude Code session — reviewed the diff from `2a1ac65` (3.10.1) through 3.11.0, 3.11.1, 3.12.0 and 3.12.1. No `doc/MIGRATION-*.md` for this range; worked from `CHANGELOG.md` and individual commit messages, verified every claim below against a real PostgreSQL 18 server. **Breaking:** an integer binary encoder (`int2`/`int4`/`int8`/`oid`/`xid`/`xid8`/`cid`) now refuses a fractional value or a non-decimal string instead of flooring/zeroing it — text encoding always refused these (`22P02`), binary silently didn't, so which behavior a caller got depended on which wire format the parameter happened to take; a `bigint` is now accepted for every one of these types, and each type's own range is checked with a message naming both the type and the value (rewrote `query-parameters.md`'s "Values with no numeric reading" section). **New:** `isMultiStatement(sql)` — a one-pass scanner a caller with a single SQL-taking entry point (an ORM adapter, a migration runner) uses to pick `query()` vs `execute()` before sending, since nothing on the wire answers that in time (new `docs/api/functions/is-multi-statement.md`, mentioned in `simple-query.md`); `PreparedStatement.resolvedParamTypes` exposes what the server's `Describe` resolved for each parameter — read-only, nothing acts on it yet, but it's the type to hand a `BindParam` for the binary encoding an untyped numeric array otherwise gives up (new property + note in `prepared-statement.md`). **Fix:** `PreparedStatement.execute()`/`executeBatch()`/cursor `Bind` didn't unwrap a `BindParam` the way `Connection.query()` does — the object itself reached the encoder and went out as `"[object Object]"` on a text column; now unwrapped, and a `BindParam` naming a different type than the statement was prepared/resolved with throws instead (documented in `prepared-statement.md`). Added measured cost numbers (2.6x–5.3x for a large `float8[]`, 1.6x for `int4[]`) to `query-parameters.md`'s unspecified-array section, sourced from the release's own re-measurement. Re-copied both benchmark reports (new run, new Peak-Heap/Retained/Net-bytes methodology, restructured into three subsections). Bumped `features.md`'s comparison caption and the navbar badge to v3.12.1. |

**Style note for future syncs:** avoid an "X of Y total" framing for what postgrejs *doesn't* do
(e.g. "125 of 172 OIDs registered, 47 aren't, here's why each can't be") — it reads as an apology
rather than a feature list. State coverage as a positive count and let a "here's the feature that
covers the rest" pointer (e.g. `unknownTypesAsString`) carry the practical info instead.

**Process note for future syncs:** when the source repo's own `doc/MIGRATION-*.md` exists for the
version range being synced, read it first — it's the release's own account of what's breaking and
why, more reliable than reconstructing it from commit messages alone. Also: re-verify claims already
in this site even when they're not the topic of the current sync (`stringify-value-for-sql.md`'s
stale `Date` example above was caught this way) — a doc can go stale for reasons other than the
release being synced.

**To check what's changed in the source since this was recorded:**

```bash
cd /Users/ehanoglu/dev/oslib/postgrejs
git fetch origin
git log --oneline 6c09694b4da3dab891bd9ec66100fe990d2bdce5..origin/dev -- src/ README.md CHANGELOG.md
git diff 6c09694b4da3dab891bd9ec66100fe990d2bdce5..origin/dev -- src/ README.md CHANGELOG.md
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
| Source commit at last copy | `6c09694b4da3dab891bd9ec66100fe990d2bdce5` |
| Node run date (from the report itself) | 2026-09-29T06:10:29.113Z |
| Bun run date (from the report itself) | 2026-09-29T06:10:29.135Z |
| Library versions in that run | PostgreJS 3.12.0, pg 8.23.0, postgres 3.4.9, Bun.sql 1.4.2 (Bun report only) |
| This repo's commit at sync time | `bbdf5a4` |
| Synced at | 2026-09-30T06:16:45Z |

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

`docusaurus.config.ts`'s navbar has a hardcoded version badge (currently `v3.7.0`, linking to npm) — it is **not**
read dynamically from the source repo's `package.json` (that path only exists on this machine,
not on the Cloudflare Pages build image), so update it by hand alongside the main documentation
sync whenever the source's version changes.

## Updating this file

After any sync, replace the relevant table's values with the new source commit hash
(`git -C /Users/ehanoglu/dev/oslib/postgrejs rev-parse HEAD`), this repo's own new commit hash once
you've committed the doc changes, and the current UTC timestamp
(`date -u +"%Y-%m-%dT%H:%M:%SZ"`).
