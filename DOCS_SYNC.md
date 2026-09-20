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
| Source commit | `940caf89f09cc792ddf62615c6972c7c88be6886` |
| Source commit (short) | `940caf8` |
| Source commit date | 2026-09-20T12:08:45+03:00 |
| Source `package.json` version | 3.6.0 |
| This repo's commit at sync time | `d2a2ace` |
| Synced at | 2026-09-20T09:32:00Z |
| Synced by | Claude Code session — reviewed the diff from `dd22acf` (3.4.0) through the 3.5.0 and 3.6.0 releases, two minor versions in one pass. Everything below was verified against a real PostgreSQL 18 server before being written up. **New:** `transaction(fn)` on `Connection`/`Pool` — commits/rolls back a callback, nests as a savepoint when a transaction is already open (new "Scoped Transactions" section in `transactions-and-savepoints.md`, methods on `connection.md`/`pool.md`); `Cursor` is now `AsyncIterable` — `for await` reads a row at a time and closes on exhaustion/break/throw (`cursors.md`, `cursor.md`); `fetchAsString` rewritten from "six hardcoded types, decoded then re-stringified" to a genuine wire-level request for any OID in the server's own text format, with a documented `timestamptz` rendering change and the array-uses-its-own-OID rule (`data-types.md`, `data-mapping-options.md`); `DataType.inferrable` to opt a custom type out of parameter inference (`data-types.md`, `data-type.md`); the prepared-statement cache and `pipeline()` now also serve statements inside an open transaction, with `rollbackOnError`'s savepoint riding the cached statement's own round trip (`extended-query.md`). **Breaking, both confirmed live against a server:** `query()` fetches every row by default instead of silently capping at 100 — `CommandResult.suspended` reports when an explicit `fetchCount` cut a result short (rewrote `extended-query.md`'s option table and "Why use a cursor" in `cursors.md`, updated `command-result.md`/`query-options.md`/`query-result.md`); `fetchAsString`'s `timestamptz` output changed shape (server's own `+00` offset instead of an ISO `Z` string) as a side effect of the wire-level rewrite above. **Fixes:** `LISTEN`/`UNLISTEN` accept any channel name PostgreSQL accepts and case-fold the same way the server does — the old `/^[A-Z]\w+$/i` regex also let a mixed-case channel register under the wrong key, so it silently never delivered anything (`notifications.md`, `connection.md`); `rowsAffected` now set for `MERGE` (`command-result.md`, `batch-result.md`); `float4` decodes as the shortest round-tripping decimal instead of the raw binary64 expansion (`data-types.md`). Re-copied both benchmark reports (new run, library versions unchanged except PostgreJS 3.5.0). Synced `getting-started/features.md`'s bullets and comparison table to match the README's own catch-up (four new bullets, two new comparison rows), and bumped the navbar badge to v3.6.0. |

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
| Source commit at last copy | `940caf89f09cc792ddf62615c6972c7c88be6886` |
| Node run date (from the report itself) | 2026-09-16T18:36:39.004Z |
| Bun run date (from the report itself) | 2026-09-16T18:36:39.044Z |
| Library versions in that run | PostgreJS 3.5.0, pg 8.23.0, postgres 3.4.9, Bun.sql 1.3.10 (Bun report only) |
| This repo's commit at sync time | `d2a2ace` |
| Synced at | 2026-09-20T09:32:00Z |

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
