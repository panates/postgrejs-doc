import ThemedImage from '@theme/ThemedImage';
import * as React from 'react';

import styles from './styles.module.css';

type Props =
  | {
      /** The project's own full logo, one file per color mode. */
      alt: string;
      light: string;
      dark: string;
    }
  | {
      /** For a project that publishes only an icon: the icon, then its name set in the site font. */
      alt: string;
      icon: string;
      name: string;
    };

export default function IntegrationLogo(props: Props) {
  return (
    <div className={styles.logo}>
      {'icon' in props ? (
        <>
          <img src={props.icon} alt={props.alt} className={styles.icon} />
          <span className={styles.name} aria-hidden="true">
            {props.name}
          </span>
        </>
      ) : (
        <ThemedImage
          alt={props.alt}
          className={styles.full}
          sources={{ light: props.light, dark: props.dark }}
        />
      )}
    </div>
  );
}
