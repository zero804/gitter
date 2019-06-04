'use strict';

const presets = ['@babel/preset-env'];
const plugins = [];

// Jest is running in node environment, so we need additional plugins
const isJest = !!process.env.JEST_WORKER_ID;
if (isJest) {
  plugins.push('@babel/plugin-transform-modules-commonjs');
}

module.exports = {
  plugins,
  presets,
  env: {
    test: {
      // from https://github.com/facebook/jest/issues/3126#issuecomment-465926747
      plugins: ['@babel/plugin-transform-runtime']
    }
  }
};
