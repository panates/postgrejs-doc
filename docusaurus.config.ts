import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkGfm from 'remark-gfm';

const config: Config = {
  title: 'PostgreJS',
  tagline: 'Blazing Fast PostgreSQL Client for Node.js',
  organizationName: 'panates',
  projectName: 'postgrejs-doc',
  url: 'https://www.postgrejs.com',
  baseUrl: '/',
  trailingSlash: false,
  favicon: 'img/favicon.ico',

  plugins: [
    [
      "docusaurus-lunr-search",
      {}],
    [
      'docusaurus-plugin-llms',
      {
        title: 'PostgreJS Documentation',
        description: 'A blazing fast PostgreSQL client for Node.js — full reference for connections, pooling, querying, data types, and every feature built from the wire protocol up.',
        generateLLMsTxt: true,
        generateLLMsFullTxt: true,
        excludeImports: true,
        removeDuplicateHeadings: true,
        logLevel: 'normal',
      },
    ],
  ],

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          remarkPlugins: [remarkGfm],
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.webp',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'PostgreJS',
      logo: {
        alt: 'PostgreJS Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'html',
          value: '<div class="navbar__separator"></div>',
          position: 'left',
        },
        {
          label: 'Documentation',
          position: 'left',
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          className: 'navbar-item-docs',
        },
        {
          label: 'Code Wiki',
          position: 'left',
          href: 'https://codewiki.google/github.com/panates/postgrejs',
        },
        {
          label: 'v3.1.0',
          position: 'right',
          href: 'https://www.npmjs.com/package/postgrejs',
          className: 'navbar-version-badge',
        },
        {
          'aria-label': 'GitHub repository',
          position: 'right',
          href: 'https://github.com/panates/postgrejs',
          className: "header--github-link"
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'SITE',
          items: [
            {
              html: `<a href="/" class="footer__link-item" style="display:inline-flex;align-items:center;gap:6px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>Home</a>`,
            },
            {
              html: `<a href="/docs/intro" class="footer__link-item" style="display:inline-flex;align-items:center;gap:6px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h8v2H8zm0-4h8v2H8z"/></svg>Documentation</a>`,
            },
            {
              html: `<a href="/docs/license" class="footer__link-item" style="display:inline-flex;align-items:center;gap:6px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z"/></svg>License</a>`,
            },
          ],
        },
        {
          title: 'COMMUNITY',
          items: [
            {
              html: `<a href="https://github.com/panates/postgrejs/issues" target="_blank" rel="noopener noreferrer" class="footer__link-item" style="display:inline-flex;align-items:center;gap:6px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>GitHub Issues</a>`,
            },
            {
              html: `<a href="https://stackoverflow.com/questions/tagged/postgrejs" target="_blank" rel="noopener noreferrer" class="footer__link-item" style="display:inline-flex;align-items:center;gap:6px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15 21H5v-2h10v2zm6-11.665l-1.571-9.335-1.53.735 1.321 9.345 1.78-.745zm-7.518 1.018l-4.29-7.45-1.597.968 4.29 7.45 1.597-.968zm4.898 3.274l-7.807-4.485-1.026 1.785 7.807 4.485 1.026-1.785zm-7.9-6.498l-1.197 8.87 1.973.267 1.197-8.87-1.973-.267zm5.52 9.874H5v2h10v-2z"/></svg>Stack Overflow</a>`,
            },
            {
              html: `<a href="https://codewiki.google/github.com/panates/postgrejs" target="_blank" rel="noopener noreferrer" class="footer__link-item" style="display:inline-flex;align-items:center;gap:6px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>Code Wiki</a>`,
            },
          ],
        },
        {
          title: 'ALSO LOOK AT',
          items: [
            {
              html: '<a href="https://www.oprajs.com" target="_blank" rel="noopener noreferrer" class="footer__link-item" style="display:inline-flex;align-items:center;gap:6px"><img src="/img/oprajs-icon.svg" width="14" height="14" alt="" style="display:inline-block"/>OPRA</a>',
            },
            {
              html: `<a href="https://www.sqbjs.com" target="_blank" rel="noopener noreferrer" class="footer__link-item" style="display:inline-flex;align-items:center;gap:6px"><img src="/img/sqb-logo.svg" width="14" height="14" alt="SQB" style="border-radius:2px"/>SQB</a>`,
            },
            {
              html: `<a href="https://github.com/panates/valgen" target="_blank" rel="noopener noreferrer" class="footer__link-item" style="display:inline-flex;align-items:center;gap:6px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>Valgen</a>`,
            },
          ],
        },
        {
          title: 'MORE',
          items: [
            {
              html: '<a href="https://github.com/panates/lightning-pool" target="_blank" rel="noopener noreferrer" class="footer__link-item" style="display:inline-flex;align-items:center;gap:6px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"/></svg>Lightning Pool</a>',
            },
            {
              html: `<a href="https://github.com/panates/ts-gems" target="_blank" rel="noopener noreferrer" class="footer__link-item" style="display:inline-flex;align-items:center;gap:6px"><img src="/img/ts-gems-logo.svg" width="14" height="14" alt="ts-gems"/>ts-gems</a>`,
            },
            {
              html: `<a href="https://github.com/panates" target="_blank" rel="noopener noreferrer" class="footer__link-item" style="display:inline-flex;align-items:center;gap:6px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>More..</a>`,
            }
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} <a href="https://www.panates.com" target="_blank">PANATES®</a>`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
