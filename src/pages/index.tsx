import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
      <header className={styles.heroImage}>
        <div className={styles.heroText}>
          <span style={{display: 'flex'}}>
            <img src="/img/posgresql-icon.svg" style={{width: 128, marginRight: '20px'}}></img>
            <p className="hero__title">{siteConfig.title}</p>
          </span>
          <p className="hero__subtitle">
            {siteConfig.tagline}
          </p>

          <div style={{display: 'flex'}}>
            <div className={styles.buttons}>
              <Link
                  className="button button--secondary button--lg button-round"
                  // style={{width: 250, background: 'rgba(255,255,255,0.71)', borderWidth: 0}}
                  to="/docs/intro">
                <span style={{display: 'flex', color: 'rgba(200,0,0,0.8)'}}>
                  <div className="book-icon-white"
                       style={{height: "24px", marginTop: "2px", marginRight: "4px",}}></div>
                  Documentation
                </span>
              </Link>
            </div>
            <div className={styles.buttons} style={{paddingLeft: 12}}>
              <Link
                  className="button button--secondary button--lg button-round"
                  style={{width: 250, background: 'transparent', borderWidth: 2}}
                  to="https://github.com/panates/postgrejs">
                <span style={{display: 'flex', color: 'white'}}>
                  <div className="github-icon-white"
                       style={{height: "32px", marginTop: "2px", marginBottom: "-10px", marginRight: "4px",}}></div>
                  Source Code
                </span>
              </Link>
            </div>
          </div>
        </div>
      </header>
  );
}

function HomepageHeader2() {
  const {siteConfig} = useDocusaurusContext();
  return (
      <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Docusaurus Tutorial - 5min ⏱️
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      // title={`${siteConfig.title}`}
      description="Enterprise level PostgreSQL client for NodeJS<head />">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
