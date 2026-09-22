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
| Source commit | `2a1ac651dff26176288e9b74f94bb6e190428f41` |
| Source commit (short) | `2a1ac65` |
| Source commit date | 2026-09-22T19:46:58+03:00 |
| Source `package.json` version | 3.10.1 |
| This repo's commit at sync time | `ada0349` |
| Synced at | 2026-09-22T18:30:00Z |
| Synced by | Claude Code session — reviewed the diff from `f5f9d79` (3.8.0) through 3.9.0, 3.10.0 and 3.10.1. Large release; read the source's own `doc/MIGRATION-v3.9-to-v3.10.md` first, then verified every claim below against a real PostgreSQL 18 server. **Breaking (reverses what an earlier sync documented):** every value class's `toJSON()` now returns its fields instead of the literal string (`String(v)`/`toPostgres()` still give the literal) — this exact reversal required fixing `data-types.md`, `geometric-types.md`, `interval.md`, `range.md`, `numeric.md`, which the 3.7.0 sync had documented the other way; `Interval` now only carries fields with a value (`iv.hours` is `undefined`, not `0`, when absent); an array of numbers/bigints now goes out as a parameter unspecified, same as strings/Dates since 3.7 (renamed `query-parameters.md`'s section to cover it); `Circle.radius` replaces `r` as the own field (`r` stays as an accessor). **New:** `temporalTypes` decodes date/time types into `Temporal` values (new "Temporal Values" section); `money` now decodes instead of arriving as a `Buffer` (new "Money" section, dropped as the "Enum, Extension..." section's example since it's no longer unregistered); `decimalAsString` for exact numeric/money decimal strings; `fetchAsString` can name an array's element OID to get its elements, or `{oid, arrays:false}` to scope to just the scalar; transaction modes (`isolationLevel`/`readOnly`/`deferrable`) on `startTransaction()`/`transaction()`/`Pool.transaction()`; a lost connection now also fires `'error'` (not just `'close'`) on a bare `Connection`; `connectionString` honored as a config field, a short list of misspelled option names (`dbname`, `username`, ...) now throws instead of silently doing nothing; every data-mapping option settable once on `Connection`/`Pool` instead of per-call; `DatabaseError.serverMessage`; `pipeline` moved to `QueryOptions`, so it's also a per-call opt-*out* on a `Connection`. **Fixes:** `postgresql://` parses its database name and is accepted as a bare scheme; empty/comment-only statements return an empty result instead of throwing; a burst of the same unprepared SQL no longer leaks orphaned server-side statements. **Also caught and fixed two pre-existing doc bugs unrelated to this release**, found while re-verifying: `stringify-value-for-sql.md` claimed a `Date` gets a `::timestamptz` cast (it's written bare — this was wrong before 3.9 too), and `sql-tag.md`'s `stringify()` example for a number array was stale before this release as well. Re-copied both benchmark reports (new run). Bumped `features.md`'s comparison caption and the navbar badge to v3.10.1. |

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
git log --oneline 2a1ac651dff26176288e9b74f94bb6e190428f41..origin/dev -- src/ README.md CHANGELOG.md
git diff 2a1ac651dff26176288e9b74f94bb6e190428f41..origin/dev -- src/ README.md CHANGELOG.md
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
| Source commit at last copy | `2a1ac651dff26176288e9b74f94bb6e190428f41` |
| Node run date (from the report itself) | 2026-09-21T13:08:25.978Z |
| Bun run date (from the report itself) | 2026-09-21T13:08:26.011Z |
| Library versions in that run | PostgreJS 3.9.0, pg 8.23.0, postgres 3.4.9, Bun.sql 1.3.10 (Bun report only) |
| This repo's commit at sync time | `ada0349` |
| Synced at | 2026-09-22T18:30:00Z |

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
