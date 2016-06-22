'use strict';

var path = require('path');
var glob = require('glob');
var ProgressBarPlugin = require('progress-bar-webpack-plugin');

module.exports = {
  entry: glob.sync(path.resolve(__dirname, './specs/**/*-test.js')),
  output: {
    path: path.join(__dirname, './fixtures/build'),
    filename: 'test.js',
    publicPath: '/fixtures/build/',
  },

  devtool: 'inline-source-map',
  module: {
    preLoaders: [
      {
        test: /\.js$/,
        exclude: /(test|node_modules|repo)/,
        loader: 'istanbul-instrumenter',
      },
    ],
    loaders: [
      {
        test: /\.hbs$/,
        loader: 'gitter-handlebars-loader', // disable minify for now + path.resolve(path.join(__dirname, "../../build-scripts/html-min-loader"))
        query: {
          helperDirs: [
            path.resolve(__dirname, '../../shared/handlebars/helpers')
          ],
          knownHelpers: [
            'cdn'
          ],
          partialsRootRelative: path.resolve(__dirname, '../../public/templates/partials') + path.sep
        }
      },
      {
        test:    /.css$/,
        loader:  'style-loader!css-loader!postcss-loader',
      }
    ],
  },
  plugins: [
     new ProgressBarPlugin(),
  ],
  resolve: {
    modulesDirectories: [
      'node_modules',
      path.resolve(__dirname, '../../public/js'),
    ],
    alias: {
      jquery:                                               path.resolve(__dirname, '../../public/repo/jquery/jquery.js'),
      cocktail:                                             path.resolve(__dirname, '../../public/repo/cocktail/cocktail.js'),
      'backbone-sorted-collection':                         path.resolve(__dirname, '../../public/repo/backbone-sorted-collection/backbone-sorted-collection.js'),
      'bootstrap_tooltip':                                  path.resolve(__dirname, '../../public/js/utils/tooltip.js'),
      'public':                                             path.resolve(__dirname, '../../public'),
      'fixtures':                                           path.resolve(__dirname, './fixtures'),
      'views/menu/room/search-results/search-results-view': path.resolve(__dirname, './fixtures/helpers/search-results-view.js'),
      'views/menu/room/search-input/search-input-view':     path.resolve(__dirname, './fixtures/helpers/search-input-view.js'),
      'utils/raf':                                          path.resolve(__dirname, './fixtures/helpers/raf.js'),
      'components/apiClient':                               path.resolve(__dirname, './fixtures/helpers/apiclient.js'),
      'utils/appevents':                                    path.resolve(__dirname, './fixtures/helpers/appevents.js'),
      'filtered-collection':                                path.resolve(__dirname, '../../public/repo/filtered-collection/filtered-collection.js'),
    },
  },
  node: {
    fs: 'empty',
  },
};
