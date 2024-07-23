import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import * as React from 'react';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

function HomepageHeader(): React.JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
      <header className={styles.heroImage}>
        <div className={styles.heroText}>
          <span style={{display: 'flex', justifyContent: 'center'}}>
            <img src="/img/logo.svg" style={{width: 128, marginRight: '20px'}} alt="Logo"></img>
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

export default function Home(): React.JSX.Element {
  return (
      <Layout
          // title={`${siteConfig.title}`}
          description="Enterprise level PostgreSQL client for NodeJS">
        <HomepageHeader/>
        <main>
          <HomepageFeatures/>
        </main>
      </Layout>
  );
}
