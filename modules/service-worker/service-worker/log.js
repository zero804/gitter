'use strict';

// Based off of https://github.com/GoogleChrome/workbox/blob/05e6bd631b9cd239b8e44eeff132533430e668cb/packages/workbox-core/src/_private/logger.ts#L55-L66

const methodToColorMap = {
  debug: `#7f8c8d`, // Gray
  log: `#2ecc71`, // Green
  warn: `#f39c12`, // Yellow
  error: `#c0392b`, // Red
  groupCollapsed: `#3498db`, // Blue
  groupEnd: null // No colored prefix on groupEnd
};

const styles = [
  `background: ${methodToColorMap.log}`,
  `border-radius: 0.5em`,
  `color: white`,
  `font-weight: bold`,
  `padding: 2px 0.5em`
];

// When in a group, the workbox prefix is not displayed.
const logPrefix = ['%csw.js', styles.join(';')];

function log(...args) {
  // eslint-disable-next-line no-console
  console.log(...logPrefix, ...args);
}

module.exports = log;
