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
| Source commit | `35aeca7eb713de61e3e5d63b15b7f4ffbe652410` |
| Source commit (short) | `35aeca7` |
| Source commit date | 2026-09-20T22:15:30+03:00 |
| Source `package.json` version | 3.7.0 |
| This repo's commit at sync time | `73d8b16` |
| Synced at | 2026-09-20T19:59:00Z |
| Synced by | Claude Code session — reviewed the diff from `940caf8` (3.6.0) through 3.6.1 and 3.7.0, a large data-type expansion (56 → 125 registered types). Everything below was verified against a real PostgreSQL 18 server before being written up. **Breaking:** `numeric` now decodes to a `number` only when a double holds it exactly, to a new `Numeric` class otherwise, instead of always going through `parseFloat` and silently rounding — new "Numeric: Exact Decimals" section with a `:::danger` admonition in `data-types.md`, new `api/classes/numeric.md`. **New type coverage:** geometric types decode to their own classes (`Point`/`Circle`/`Box`/`LineSegment`/`Line`/`Path`/`Polygon`) instead of plain objects, which also changes what `JSON.stringify()` produces for them; `interval` decodes to a new `Interval` class; the range/multirange family decodes to a new `Range` class that carries its own OID and round-trips as a parameter without being renamed; `inet`/`cidr`/`macaddr`/`macaddr8`/`bit`/`varbit` decode to strings, `jsonpath`/`tsvector`/`tsquery` to PostgreSQL's own normalized text, and `tid`/`xid`/`xid8`/`cid`/`pg_lsn`/`pg_snapshot`/`txid_snapshot`/`refcursor`/`pg_node_tree` round out the system-column/identifier types (three new `data-types.md` sections, new `api/classes/{geometric-types,interval,range}.md`); `unknownTypesAsString` asks the server for text on the 47 types that still can't be decoded (`money`, the `reg*` family, ...) instead of a raw `Buffer` (`data-mapping-options.md`, new "Types That Can't Be Decoded" section). **Connection loss:** a backend going away (admin kill, failover, network fault) now rejects the in-flight call and fires `Connection`/`Pool` events with a `ConnectionLostError` (`code: '08006'`, carries `processID`) instead of a bare `Error` — new "Lost Connections" section in `error-handling.md`, new `api/classes/connection-lost-error.md`, updated `Connection`'s `'close'` event and `Pool`'s `'destroy'`/`'error'` events. **Fixes:** `stringifyValueForSQL()` now asks `determine()` what type an object is instead of defaulting every object to `::json`, so a `Point`/`Range`/`Interval`/`Date` writes its own correct literal (`stringify-value-for-sql.md`); the prepared-statement cache also recovers from a dropped-and-recreated type invalidating a cached plan (`XX000`), not just a result-type change (`0A000`) (`extended-query.md`). Also bumped the data-type counts and version caption in `features.md`'s comparison table, added three new Features bullets, and bumped the navbar badge to v3.7.0. Benchmark reports unchanged since the last sync (same run, still PostgreJS 3.5.0 in the measured library versions). |

**To check what's changed in the source since this was recorded:**

```bash
cd /Users/ehanoglu/dev/oslib/postgrejs
git fetch origin
git log --oneline 35aeca7eb713de61e3e5d63b15b7f4ffbe652410..origin/dev -- src/ README.md CHANGELOG.md
git diff 35aeca7eb713de61e3e5d63b15b7f4ffbe652410..origin/dev -- src/ README.md CHANGELOG.md
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
| Source commit at last copy | `35aeca7eb713de61e3e5d63b15b7f4ffbe652410` |
| Node run date (from the report itself) | 2026-09-16T18:36:39.004Z |
| Bun run date (from the report itself) | 2026-09-16T18:36:39.044Z |
| Library versions in that run | PostgreJS 3.5.0, pg 8.23.0, postgres 3.4.9, Bun.sql 1.3.10 (Bun report only) |
| This repo's commit at sync time | `73d8b16` |
| Synced at | 2026-09-20T19:59:00Z |

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
