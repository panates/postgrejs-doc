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
| Source commit | `906d4287509307b799230dfb9bd725837907e0e8` |
| Source commit (short) | `906d428` |
| Source commit date | 2026-10-09T13:36:56+00:00 |
| Source `package.json` version | 3.14.0 (in the repo; **not on npm yet**, latest published is 3.13.0) |
| This repo's commit at sync time | `d338308` |
| Synced at | 2026-10-09T14:30:00Z |
| Synced by | Claude Code session — reviewed the diff from `6c09694` (3.12.1) through 3.12.2, 3.12.3 and 3.13.0. No `doc/MIGRATION-*.md` for this range; worked from commit messages, verified each claim below against a real PostgreSQL 18 server. **Behavior change:** a finite non-integer JS number is now declared `numeric` instead of `float8`, because PostgreSQL has `numeric → money` (an assignment cast) but no `float8 → money` at all — `($1::money)::text` worked with `12` and failed with `42846` for `12.34`; a `float8` column is unaffected (`numeric → float8` is implicit, checked bit for bit), `NaN`/`±Infinity` stay `float8` (documented in `query-parameters.md`'s "Automatic type detection"). **Fix:** `BindParam(0, v)` (undeclared) now writes a value the way `pg` does — `toPostgres()` honored, a plain object as JSON, also inside arrays — instead of `[object Object]` (new "OID `0`: no declared type" subsection in `query-parameters.md` + a pointer from `bind-param.md`); a pre-2000 `date` encoded in binary was a day late (`Math.trunc` → `Math.floor`; no doc change — never documented, and the fix is internal). **Perf, no doc change:** a reused `Date` binds binary against the type the server resolved from the third execution on; statement assembly from a view of the Bind; the README's SQB label is now "first-party adapter" (we never said "native"). No new exports. Re-copied both benchmark reports (new run date; one new methodology bullet about `asyncErrorHandling` being off in the harness). Bumped `features.md`'s comparison caption and the navbar badge to v3.13.0. **Update 2026-10-09 (source `1a4e5df` → `d34aacf`, `package.json` still 3.13.0):** the only change is **Cloudflare Workers support, which is NOT in a published release** (latest on npm is 3.13.0; the Workers code — `workerd-socket.ts`, `startTls()` upgrade, the refusals for `sslNegotiation: 'direct'` and `channelBinding: 'require'` — landed after it on `dev`). Documented anyway at the maintainer's request in a new `docs/connecting/cloudflare-workers.md` (slug `/guides/cloudflare-workers`, so `https://www.postgrejs.com/docs/guides/cloudflare-workers`), with a "Not in a published release yet" caution that must be removed once a release ships; also a pointer in `ssl-tls.md`, a `features.md` bullet and comparison row. The workerd behavior (TLS, Hyperdrive, `os.totalmem()` = 0) is taken from the source repo's `doc/CLOUDFLARE-WORKERS.md` — not re-measured here (no `wrangler`); the `sslmode=disable` string Hyperdrive hands over was checked against a real server. The source README's "Cloudflare Workers - ... without TLS" bullet contradicts that doc and the code (TLS works for public-CA certificates); the doc was followed. Re-verify on the release that carries it. **Update 2026-10-09 (later; source `d34aacf` → `906d428`, release commit v3.14.0):** the release is only the Cloudflare Workers work already documented above plus README changes (a "Runs Where You Run" group; the CI matrix stated as Node 20/22/24/26 × PostgreSQL 12/16/18, Bun against 18, Workers not in CI). Applied: `installation.md` requirements and `features.md` test-matrix wording (it said "PostgreSQL 12 through 18"; the matrix is 12, 16 and 18), a "by hand, not in CI" note on the Workers page, and a "Runs where you run" section on the homepage. **The npm registry still showed 3.13.0 as latest when this was written**, so the Workers page keeps its "Not in a published release yet" caution and the navbar badge / `features.md` caption stay at 3.13.0 — flip all three once 3.14.0 is on npm. The source README's "Cloudflare Workers - ... without TLS" bullet is still there and still contradicts `doc/CLOUDFLARE-WORKERS.md`. |

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
git log --oneline 906d4287509307b799230dfb9bd725837907e0e8..origin/dev -- src/ README.md CHANGELOG.md
git diff 906d4287509307b799230dfb9bd725837907e0e8..origin/dev -- src/ README.md CHANGELOG.md
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
| Source commit at last copy | `906d4287509307b799230dfb9bd725837907e0e8` |
| Node run date (from the report itself) | 2026-10-05T17:29:57.699Z |
| Bun run date (from the report itself) | 2026-10-05T17:29:57.704Z |
| Library versions in that run | PostgreJS 3.12.0, pg 8.23.0, postgres 3.4.9, Bun.sql 1.4.2 (Bun report only) |
| This repo's commit at sync time | `a325b85` |
| Synced at | 2026-10-06T13:28:15Z |

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
