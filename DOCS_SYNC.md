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
| Source commit | `62faa88ee843ca65b58edfa4a9809b93d1dd73a1` |
| Source commit (short) | `62faa88` |
| Source commit date | 2026-09-15T23:24:42+03:00 |
| Source `package.json` version | 3.4.0 |
| This repo's commit at sync time | `128b5d5` |
| Synced at | 2026-09-15T20:26:08Z |
| Synced by | Claude Code session — reviewed the 3.3.0→3.4.0 diff in two passes. First pass covered the code (`PreparedStatement.executeBatch()`: new "Batch Execution" section in `guides/prepared-statements.md`, `executeBatch()` on `api/classes/prepared-statement.md`, new `api/interfaces/batch-result.md`, `batchIndex`/`batchResults` on `api/classes/database-error.md`) while the source README hadn't listed it yet. A second pass, after the README caught up (`62faa88`), added the matching **Batch Execution** bullet and **Batch execution** Feature Comparison row to `getting-started/features.md`, and bumped the comparison table's version caption to postgrejs 3.4.0. Bumped the navbar version badge to v3.4.0. |

**To check what's changed in the source since this was recorded:**

```bash
cd /Users/ehanoglu/dev/oslib/postgrejs
git fetch origin
git log --oneline 62faa88ee843ca65b58edfa4a9809b93d1dd73a1..origin/dev -- src/ README.md CHANGELOG.md
git diff 62faa88ee843ca65b58edfa4a9809b93d1dd73a1..origin/dev -- src/ README.md CHANGELOG.md
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
| Source commit at last copy | `0420895da033d8e4b51354e69c29e308b87561c8` |
| Node run date (from the report itself) | 2026-09-14T14:56:39.954Z |
| Bun run date (from the report itself) | 2026-09-14T14:56:39.975Z |
| Library versions in that run | PostgreJS 3.3.0, pg 8.23.0, postgres 3.4.9, Bun.sql 1.3.10 (Bun report only) |
| This repo's commit at sync time | `2aec1e8` |
| Synced at | 2026-09-14T15:12:08Z |

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
