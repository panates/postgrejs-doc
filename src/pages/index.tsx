import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';
import * as React from 'react';

import styles from './index.module.css';

const IconWireProtocol = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="16" width="34" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 16v-3a3 3 0 0 1 3-3h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M32 24v3a3 3 0 0 1-3 3h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="11" cy="20" r="1.6" fill="currentColor" />
    <circle cx="17" cy="20" r="1.6" fill="currentColor" />
    <circle cx="23" cy="20" r="1.6" fill="currentColor" />
    <circle cx="29" cy="20" r="1.6" fill="currentColor" />
  </svg>
);

const IconStatements = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="4" width="30" height="32" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <line x1="11" y1="13" x2="29" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="11" y1="20" x2="24" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="11" y1="27" x2="26" y2="27" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M27 24l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
  </svg>
);

const IconTypeScript = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="34" height="34" rx="4" stroke="currentColor" strokeWidth="1.8" />
    <path d="M11 16h9M15.5 16v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M23 26c0 1.66 1.57 3 3.5 3s3.5-1.1 3.5-2.5-1.3-2-3.5-2.5-3.5-1.34-3.5-2.5S24.4 19 26.5 19s3.2.9 3.4 2.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IconSqlTag = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 10a3 3 0 0 1 3-3h9l20 20a3 3 0 0 1 0 4.24l-4.76 4.76a3 3 0 0 1-4.24 0L7 16V10z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <path d="M15 25l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IconBeyondQuery = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 4l14 7v18l-14 7-14-7V11l14-7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M20 4v32M6 11l14 7 14-7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

const IconMultiHost = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="8" cy="30" r="4" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="32" cy="30" r="4" stroke="currentColor" strokeWidth="1.8" />
    <path d="M17.5 11.5L10 26.5M22.5 11.5L30 26.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="20" cy="8" r="1.4" fill="currentColor" />
  </svg>
);

const SIMPLE_QUERY_CODE = `import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost/mydb');
await connection.connect();

const result = await connection.query(
  'select * from cities where name like $1',
  { params: ['%york%'] },
);
console.log(result.rows);`;

const CURSOR_CODE = `import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost/mydb');
await connection.connect();

const result = await connection.query(
  'select * from cities', { cursor: true },
);
let row;
while ((row = await result.cursor.next())) {
  console.log(row);
}
await result.cursor.close();`;

const PILLARS = [
  {
    icon: <img src="/img/clock.svg" alt="" className={styles.pillarIconImg} />,
    title: 'Blazing Fast.',
    description:
      'Up to 6.6× faster than the competition in pooled-query benchmarks — with a smaller peak-heap footprint in almost every scenario.',
  },
  {
    icon: <img src="/img/stock.svg" alt="" className={styles.pillarIconImg} />,
    title: 'One package. Everything included.',
    description:
      'Cursors, prepared statements, LISTEN/NOTIFY, COPY streams, large objects, logical replication, multi-host failover, two-phase commit — all built in, not scattered across a half-dozen add-on packages.',
  },
  {
    icon: <img src="/img/binary.svg" alt="" className={styles.pillarIconImg} />,
    title: 'Binary by default.',
    description:
      'The only one of the three that speaks binary both ways — encoding parameters and decoding results — for every supported type, with per-column control when you still want text.',
  },
];

const FEATURES = [
  {
    icon: <IconWireProtocol />,
    title: 'Speaks binary, not just text.',
    description: 'Full binary wire protocol for every supported PostgreSQL type, with per-column format selection — a control most drivers don’t expose at all.',
  },
  {
    icon: <IconStatements />,
    title: 'Named statements. Streaming cursors.',
    description: 'Explicit, reusable prepared statements, and server-side cursors that stream a large result set instead of buffering all of it in memory.',
  },
  {
    icon: <IconTypeScript />,
    title: 'TypeScript, all the way down.',
    description: 'Every config field, query option, and result row is typed — the compiler catches what a stale JSDoc comment would only suggest.',
  },
  {
    icon: <IconSqlTag />,
    title: 'Compose SQL, not strings.',
    description: 'The sql tag builds parameterized statements from fragments — sql.values() and sql.set() turn a plain object into an INSERT or UPDATE clause.',
  },
  {
    icon: <IconBeyondQuery />,
    title: 'COPY, large objects, logical replication.',
    description: 'Bulk import/export as Node streams, file-like access to data too big for a column, and pgoutput change streaming — all in the one package.',
  },
  {
    icon: <IconMultiHost />,
    title: 'Finds the primary on its own.',
    description: 'List several hosts and a target role — read-write, standby, prefer-standby — and postgrejs picks the right server the same way libpq does.',
  },
];

const BEFORE_AFTER = [
  {
    before: 'Parameters get stringified before they’re sent, and results come back as text — every round trip pays a decoding tax.',
    after: 'Binary wire format by default, both directions. Pooled queries run up to 6.6× faster than the competition.',
  },
  {
    before: 'Cursors, COPY, large objects, logical replication — pieced together from several separately-maintained packages, if they exist at all.',
    after: 'All of it in the one package: cursors, prepared statements, COPY streams, large objects, logical replication, multi-host failover, two-phase commit.',
  },
  {
    before: 'Binary decoding is often partial — a missing parser for a common type, or an array decoder that only handles a few element types correctly.',
    after: '56 types encode and decode correctly in both text and binary, verified by a test suite that runs on every push against PostgreSQL 12 through 18.',
  },
  {
    before: 'No transaction API, or one without two-phase commit for coordinating a commit across connections.',
    after: 'Transactions, savepoints, and two-phase commit — prepareTransaction() today, commitPrepared() from anywhere, later.',
  },
  {
    before: 'One connection, one host. A failover means reconfiguring and reconnecting by hand.',
    after: 'List several hosts and a target role; postgrejs finds the current primary automatically, on the next connect.',
  },
  {
    before: 'An async error’s stack trace points into the driver’s own internals, not the line that called it.',
    after: 'Errors keep your own call site in the stack — and point at the exact line and column in the SQL that failed.',
  },
];

function Hero() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroImgWrap} aria-hidden="true">
        <img src="/img/main_banner.webp" alt="" className={styles.heroImg} />
        <div className={styles.heroImgFade} />
      </div>
      <div className={styles.heroInner}>
        <div className={styles.heroText}>
          <div className={styles.heroMeet}>Meet</div>
          <h1 className={styles.heroTitle}>PostgreJS</h1>
          <div className={styles.heroLabel}>Blazing Fast PostgreSQL Client</div>
          <p className={styles.heroSubtitle}>
            Up to 6.6× faster than its competitors — a binary wire protocol built from scratch,
            with nothing slowing it down.
          </p>
          <div className={styles.heroCtas}>
            <Link className={`button button--primary button--lg ${styles.heroBtn}`} to="/docs/intro">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
              Get Started
            </Link>
            <Link className={`button button--outline button--lg ${styles.heroBtn} ${styles.heroGithubBtn}`} to="https://github.com/panates/postgrejs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Pillars() {
  return (
    <section className={styles.pillars}>
      <div className="container">
        <div className={styles.pillarsGrid}>
          {PILLARS.map(p => (
            <div key={p.title} className={styles.pillar}>
              <div className={styles.pillarIcon}>{p.icon}</div>
              <h3 className={styles.pillarTitle}>{p.title}</h3>
              <p className={styles.pillarDesc}>{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CodeExample() {
  return (
    <section className={styles.codeSection}>
      <div className="container">
        <div className={styles.codeSectionHeader}>
          <h2>Query the way the moment calls for.</h2>
          <p>A parameterized query for one row, or a cursor when the result set doesn't fit in memory — same connection, same options.</p>
        </div>
        <div className={styles.codeGrid}>
          <div className={styles.codePanel}>
            <div className={styles.codePanelLabel}>A parameterized query</div>
            <CodeBlock language="typescript">{SIMPLE_QUERY_CODE}</CodeBlock>
          </div>
          <div className={styles.codePanel}>
            <div className={styles.codePanelLabel}>Streaming a large result with a cursor</div>
            <CodeBlock language="typescript">{CURSOR_CODE}</CodeBlock>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className={styles.features}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Everything a PostgreSQL client should do</h2>
        <div className={styles.featuresGrid}>
          {FEATURES.map(f => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon} style={{ color: 'var(--ifm-color-primary)' }}>
                {f.icon}
              </div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  return (
    <section className={styles.comparison}>
      <div className="container">
        <div className={styles.comparisonHeader}>
          <h2>How postgrejs compares</h2>
          <p>Checked against the source of <code>pg</code> and <code>postgres.js</code>, not their documentation.</p>
        </div>
        <div className={styles.compareGrid}>
          <div className={styles.compareColHeader}>
            <span className={styles.compareLabelBefore}>The usual way</span>
          </div>
          <div className={styles.compareColHeader}>
            <span className={styles.compareLabelAfter}>With postgrejs</span>
          </div>
          {BEFORE_AFTER.map((row, i) => (
            <React.Fragment key={i}>
              <div className={styles.compareCell}>
                <span className={styles.compareX}>✕</span>
                <p>{row.before}</p>
              </div>
              <div className={`${styles.compareCell} ${styles.compareCellAfter}`}>
                <span className={styles.compareCheck}>✓</span>
                <p>{row.after}</p>
              </div>
            </React.Fragment>
          ))}
        </div>
        <p className={styles.comparisonFooter}>
          See the full <Link to="/docs/getting-started/features#feature-comparison">feature comparison table</Link> for every row and its footnotes.
        </p>
      </div>
    </section>
  );
}

function QuickStart() {
  return (
    <section className={styles.quickStart}>
      <div className="container">
        <div className={styles.quickStartInner}>
          <h2>Ready to connect?</h2>
          <p>Install postgrejs and run your first query in a few lines.</p>
          <Link className="button button--primary button--lg" to="/docs/intro">
            Read the docs →
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): React.JSX.Element {
  return (
    <Layout description="Blazing fast PostgreSQL client for Node.js — up to 6.6× faster than the competition, with a binary wire protocol built from scratch.">
      <Hero />
      <main>
        <Pillars />
        <CodeExample />
        <Features />
        <Comparison />
        <QuickStart />
      </main>
    </Layout>
  );
}
