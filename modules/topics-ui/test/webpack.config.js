"use strict";

var webpack = require('webpack');
var webpackConfig = require('../webpack.config.js');
var _ = require('lodash');
var path = require('path');


var opts = require('yargs')
  .option('use-sourcemaps', {
    description: 'Whether to use sourcemaps',
    default: false
  })
  .help('help')
  .alias('help', 'h')
  .argv;

var moduleConfig = _.extend({}, (webpackConfig.module || {}), {
  loaders: (webpackConfig.module.loaders || []).concat([
    {
      // Fix via https://github.com/webpack/webpack/issues/177#issuecomment-151916287
      test: /sinon\.js$/,
      loader: 'imports?define=>false,require=>false'
    }
  ])
});

var config = _.extend({}, webpackConfig, {
  // Use `'source-map'` when you want working source-maps in the browser tests
  devtool: opts.useSourcemaps ? 'source-map' : 'eval',
  entry: {
    runner: path.resolve(__dirname, './fixtures/runner-browser.js')
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, './fixtures/build'),
  },
  module: moduleConfig,
  resolve: {
    alias: {
      backbone: require.resolve('backbone/backbone.js'),
      mocha: require.resolve('mocha/mocha.js'),
      mochaCss: require.resolve('mocha/mocha.css'),
      jquery: require.resolve('jquery/dist/jquery.js'),
      sinon: require.resolve('sinon/pkg/sinon.js'),
      'gitter-realtime-client/lib/simple-filtered-collection': require.resolve('gitter-realtime-client/lib/simple-filtered-collection'),
      'gitter-realtime-client': path.resolve(__dirname, './mocks/realtime.js'),
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'useSourcemaps': opts.useSourcemaps
      }
    })
  ]
});

//Load in the mocha CSS so everything looks pretty
config.module.loaders.push({
  test:    /.css$/,
  loader:  'style-loader!css-loader',
});

module.exports = config;
