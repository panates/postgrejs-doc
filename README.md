<p align="center">
  <img src="https://www.postgrejs.com/img/logo.svg" alt="PostgreJS" height="96">
</p>

# postgrejs-doc

The source of [www.postgrejs.com](https://www.postgrejs.com), the documentation site for
[postgrejs](https://github.com/panates/postgrejs).

Documentation: **[www.postgrejs.com](https://www.postgrejs.com)**

Built with [Docusaurus](https://docusaurus.io/). Node 22 or later, and pnpm, which the
`packageManager` field pins.

## Develop

```bash
pnpm install
pnpm start
```

`pnpm start` serves the site on http://localhost:3000 and reloads as you edit.

```bash
pnpm build       # static site into build/
pnpm serve       # serve what build/ holds
pnpm typecheck
```

`pnpm build` fails on a broken internal link, because `onBrokenLinks` is set to `throw`. It also
generates `build/llms.txt` and `build/llms-full.txt` through `docusaurus-plugin-llms`; neither has a
source file to edit, so check them in `build/` after changing anything under `docs/`.

## Deploy

Cloudflare Pages builds this site from `origin/main`. Merging into `dev` does not publish anything:
a release is a pull request from `dev` to `main`, and the site follows a minute or two later.

```bash
pnpm preview     # build, then serve it through wrangler locally
pnpm deploy      # wrangler pages deploy, for a deploy by hand
```

## Where the content comes from

The pages are written against a particular release of the source repository rather than generated
from it. `DOCS_SYNC.md` records which commit of `postgrejs` the content was last verified against,
what was checked and what was deliberately left out. Read it before a sync and update it after one.

`CLAUDE.md` holds the rules of working here, including the routine to run before every push.
