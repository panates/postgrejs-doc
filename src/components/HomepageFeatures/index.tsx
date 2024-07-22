import clsx from 'clsx';
import Heading from '@theme/Heading';
import React from 'react';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: React.JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Super Fast!',
    Svg: require('@site/static/img/rocket.svg').default,
    description: (
      <>
        PostgreJS is exceptionally fast, thanks to its implementation of the full binary wire protocol for all
        PostgreSQL data types. This ensures not only robust and efficient data handling but also minimizes
        overhead and maximizes throughput, making it ideal for performance-critical applications.
      </>
    ),
  },
  {
    title: 'Rich Features',
    Svg: require('@site/static/img/puzzle.svg').default,
    description: (
      <>
        Rich features like, prepared statements, bind parameters, cached cursors, notifications, extensible data-types, and more..
      </>
    ),
  },
  {
    title: 'Strictly Typed',
    Svg: require('@site/static/img/typescript.svg').default,
    description: (
      <>
        Modern JavaScript library, completely written in TypeScript, offering strong typing and enhanced development experience.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" style={{padding: "16px"}} />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): React.JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
