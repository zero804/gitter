'use strict';

const _ = require('lodash');
const cdn = require('gitter-web-cdn');

function cdnUrlGenerator(url, options = {}) {
  if (options.root) {
    return options.root + url;
  }

  return cdn(url, {});
}

let webpackBuildManifest;
function generateAssetsForChunk(chunkName) {
  // We have this loaded just in time so we can wait for the initial Gitter boot-up that creates the manifest
  try {
    webpackBuildManifest =
      // eslint-disable-next-line node/no-unpublished-require, node/no-missing-require
      webpackBuildManifest || require('../../../output/assets/js/webpack-manifest.json');
  } catch (err) {
    throw new Error(
      `You probably need to wait for the Gitter webpack build to finish. Error occured while requiring \`output/assets/js/webpack-manifest.json\`: ${err}\n${
        err.stack
      }`
    );
  }

  const defaultAssets = webpackBuildManifest.entrypoints.default.assets || [];
  const entryAssets = webpackBuildManifest.entrypoints[chunkName].assets;
  const assets = Object.keys(
    defaultAssets
      .concat(entryAssets)
      .filter(asset => !/.*\.map$/.test(asset))
      .reduce((assetMap, asset) => {
        assetMap[asset] = true;
        return assetMap;
      }, {})
  );

  return assets;
}

const bootScriptHelper = _.memoize(function(chunkName, parameters) {
  const options = parameters.hash;
  const jsRoot = (options && options.jsRoot) || 'js';

  const assets = generateAssetsForChunk(chunkName);

  const baseUrl = cdnUrlGenerator(jsRoot + '/', options);
  const chunkScriptList = assets.map(asset => {
    const cdnUrl = cdnUrlGenerator(`${jsRoot}/${asset}`, options);
    return `<script type="text/javascript" src="${cdnUrl}"></script>`;
  });

  return `
    <script type="text/javascript">window.webpackPublicPath = '${baseUrl}';</script>
    ${chunkScriptList.join('\n')}
  `;
});

module.exports = {
  generateAssetsForChunk,
  bootScriptHelper
};
