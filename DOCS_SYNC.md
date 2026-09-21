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
| Source commit | `f5f9d79677622b2ce1b7510f0b3a4dd309f74e74` |
| Source commit (short) | `f5f9d79` |
| Source commit date | 2026-09-21T09:30:59+03:00 |
| Source `package.json` version | 3.8.0 |
| This repo's commit at sync time | `e35b206` |
| Synced at | 2026-09-21T06:55:00Z |
| Synced by | Claude Code session — reviewed the diff from `35aeca7` (3.7.0) through 3.8.0, a small release. Everything below was verified against a real PostgreSQL 18 server before being written up. **New:** `'notice'` event on `Connection`/`Pool` — a `RAISE NOTICE`, or PostgreSQL's own "table does not exist, skipping" from `DROP TABLE IF EXISTS`, now reaches the caller instead of being silently dropped (new "Server Notices" section in `error-handling.md`, events added to `connection.md`/`pool.md`). **Fixes:** a plain `string` or `Date` parameter (and arrays of either) now goes out with no declared type instead of `varchar`/`timestamp`, letting the server resolve it from context — fixes `json`/`jsonb` columns, enum columns, `uuid` comparisons, `coalesce()`, array-typed columns, and `timestamptz` round-tripping across session time zones, all previously refused or silently wrong; costs one thing, a parameter with no context at all (`$1 is null`) now needs a cast or `BindParam` (new "Strings and Dates go out unspecified" section in `query-parameters.md`, noted the `determine()`-bypass in `data-type-map.md`); a binary-encoded array parameter now writes PostgreSQL's own lower bound (`1`) instead of `0`, so `v[1]`/`array_lower(v,1)` agree with a text literal's (noted in `data-types.md`'s Array types section). Also bumped the navbar badge and `features.md`'s comparison caption to v3.8.0, added a Features bullet for notices. Benchmark reports unchanged since the last sync (same run). |

**Style note for future syncs:** avoid an "X of Y total" framing for what postgrejs *doesn't* do
(e.g. "125 of 172 OIDs registered, 47 aren't, here's why each can't be") — it reads as an apology
rather than a feature list. State coverage as a positive count and let a "here's the feature that
covers the rest" pointer (e.g. `unknownTypesAsString`) carry the practical info instead.

**To check what's changed in the source since this was recorded:**

```bash
cd /Users/ehanoglu/dev/oslib/postgrejs
git fetch origin
git log --oneline f5f9d79677622b2ce1b7510f0b3a4dd309f74e74..origin/dev -- src/ README.md CHANGELOG.md
git diff f5f9d79677622b2ce1b7510f0b3a4dd309f74e74..origin/dev -- src/ README.md CHANGELOG.md
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
