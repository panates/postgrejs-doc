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
| Source commit | `151779f74a98868f014302370e142c26d56bfc27` |
| Source commit (short) | `151779f` |
| Source commit date | 2026-09-09T21:09:41+03:00 |
| Source `package.json` version | 3.1.0 |
| This repo's commit at sync time | `99005f3` |
| Synced at | 2026-09-09T18:11:56Z |
| Synced by | Claude Code session — covered the 3.0.3→3.1.0 diff (`callFunction()`, `longCancelKey`, `protocolNegotiation`, the `secretKey` type fix) plus the matching README Features/Feature Comparison update |

**To check what's changed in the source since this was recorded:**

```bash
cd /Users/ehanoglu/dev/oslib/postgrejs
git fetch origin
git log --oneline 151779f74a98868f014302370e142c26d56bfc27..origin/dev -- src/ README.md CHANGELOG.md
git diff 151779f74a98868f014302370e142c26d56bfc27..origin/dev -- src/ README.md CHANGELOG.md
```

Review the diff for: new/removed exports (need new/removed API reference pages), changed method
signatures or option defaults (need corrections in the relevant guide + API page), new README
feature-list or feature-comparison-table entries (need a new guide page + homepage update), and
any `CHANGELOG.md` entries not yet reflected in `docs/migration-from-v2.md` or the guides.

## Benchmarks page (`docs/getting-started/benchmarks.md`)

This one is copied close to verbatim from `doc/BENCHMARKS.md` in the source repo and gets
regenerated independently of the rest of the docs (a different run of `npm run bench:report`
doesn't imply any API/feature change) — track it separately.

| Field | Value |
|---|---|
| Source file | `/Users/ehanoglu/dev/oslib/postgrejs/doc/BENCHMARKS.md` |
| Source commit at last copy | `82831e742a047db42de59e21c9311ec5eb19aa48` |
| Benchmark run date (from the report itself) | 2026-09-07T21:49:59.163Z |
| Library versions in that run | PostgreJS 3.0.3, pg 8.23.0, postgres 3.4.9 |
| This repo's commit at sync time | `944f298924bd358457ba908c73808e3f532436a5` |
| Synced at | 2026-09-09T05:03:32Z |

**To check for a newer report:**

```bash
grep -n "Run date" /Users/ehanoglu/dev/oslib/postgrejs/doc/BENCHMARKS.md
```

If the run date is newer than the one recorded above, re-copy the file and reapply the MDX
compatibility fixes (raw HTML `style="..."` → JSX `style={{...}}` object, a blank line after every
`</div>`/`</table>`, `<tbody>` if the layout ever goes back to `<table>`, and the relative
`benchmark/README.md` link → an absolute GitHub URL) — see this repo's commit history around
`8078037`, `5c70288`, and `944f298` for exactly what those fixes looked like last time the report's
own HTML layout changed.

## Navbar version badge

`docusaurus.config.ts`'s navbar has a hardcoded `v3.1.0` badge (linking to npm) — it is **not**
read dynamically from the source repo's `package.json` (that path only exists on this machine,
not on the Cloudflare Pages build image), so update it by hand alongside the main documentation
sync whenever the source's version changes.

## Updating this file

After any sync, replace the relevant table's values with the new source commit hash
(`git -C /Users/ehanoglu/dev/oslib/postgrejs rev-parse HEAD`), this repo's own new commit hash once
you've committed the doc changes, and the current UTC timestamp
(`date -u +"%Y-%m-%dT%H:%M:%SZ"`).
