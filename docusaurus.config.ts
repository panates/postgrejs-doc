import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkGfm from 'remark-gfm';

const config: Config = {
  title: 'PostgreJS',
  tagline: 'Professional PostgreSQL client for NodeJS',
  organizationName: 'panates',
  projectName: 'postgrejs-doc',
  url: 'https://postgrejs.panates.com',
  baseUrl: '/',
  trailingSlash: false,
  favicon: 'img/favicon.ico',

  plugins: [
    [
      "docusaurus-lunr-search",
      {}],
    [
      "docusaurus-plugin-remote-content",
      {
        // options here
        name: "changelog", // used by CLI, must be path safe
        sourceBaseUrl: "https://raw.githubusercontent.com/panates/postgrejs/master/", // the base url for the markdown (gets prepended to all of the documents when fetching)
        outDir: "./src/pages", // the base directory to output to.
        documents: ["CHANGELOG.md"], // the file names to download,
        modifyContent: (filename, content) => {
          // if (filename.includes("CHANGELOG")) {
          return {
            content: `---
title: Change Log
description: Change log
hide_table_of_contents: true
---

${content}`, // <-- this last part adds in the rest of the content, which would otherwise be discarded
          }
          // }

          // return content
        },
      },
    ],
  ],

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

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
    navbar: {
      title: 'PostgreJS',
      logo: {
        alt: 'PostgreJS Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          label: 'Documentation',
          position: 'left',
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
        },
        {
          to: '/CHANGELOG',
          label: 'Change Log',
          position: 'left'
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
          title: 'Docs',
          items: [
            {
              label: 'Introduction',
              to: '/docs/intro',
            },
            {
              label: 'License',
              to: '/docs/license',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/postgrejs',
            },
            {
              label: 'X (Twitter)',
              href: 'https://x.com/panates',
            },
            {
              label: 'LinkedIn',
              href: 'https://www.linkedin.com/company/panates',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/panates/postgrejs',
            },
            {
              label: 'NPM',
              href: 'https://www.npmjs.com/package/postgrejs',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Panates ®`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
