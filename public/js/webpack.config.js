'use strict';

const path = require('path');
const webpack = require('webpack');
const ProvidePlugin = require('webpack/lib/ProvidePlugin');
const ContextReplacementPlugin = require('webpack/lib/ContextReplacementPlugin');
const StatsWriterPlugin = require('webpack-stats-plugin').StatsWriterPlugin;
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const getPostcssStack = require('@gitterhq/styleguide/postcss-stack');

// Default to production unless we know for sure we are in dev
const IS_PRODUCTION = process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'dev';
const WEBPACK_REPORT = process.env.WEBPACK_REPORT;

const ROOT_PATH = path.resolve(__dirname, '../../');

const webpackConfig = {
  mode: IS_PRODUCTION ? 'production' : 'development',
  target: 'web',

  entry: {
    default: [path.resolve(path.join(__dirname, './default'))],

    'router-nli-app': path.resolve(path.join(__dirname, './router-nli-app.js')),
    'router-nli-chat': path.resolve(path.join(__dirname, './router-nli-chat.js')),
    'router-app': path.resolve(path.join(__dirname, './router-app.js')),
    'router-chat': path.resolve(path.join(__dirname, './router-chat.js')),
    explore: path.resolve(path.join(__dirname, './explore.js')),
    'router-login': path.resolve(path.join(__dirname, './router-login.js')),
    'login-upgrade-landing': path.resolve(path.join(__dirname, './login-upgrade-landing.js')),
    'just-tracking': path.resolve(path.join(__dirname, './just-tracking.js')),
    'router-mobile-app': path.resolve(path.join(__dirname, './router-mobile-app.js')),
    'mobile-userhome': path.resolve(path.join(__dirname, './mobile-userhome.js')),
    'mobile-nli-chat': path.resolve(path.join(__dirname, './mobile-nli-chat.js')),
    'mobile-chat': path.resolve(path.join(__dirname, './mobile-chat')),
    'router-archive-chat': path.resolve(path.join(__dirname, './router-archive-chat')),
    'router-archive-home': path.resolve(path.join(__dirname, './router-archive-home')),
    'router-archive-links': path.resolve(path.join(__dirname, './router-archive-links')),
    'router-embed-chat': path.resolve(path.join(__dirname, './router-embed-chat')),
    'router-nli-embed-chat': path.resolve(path.join(__dirname, './router-nli-embed-chat')),
    homepage: path.resolve(path.join(__dirname, './homepage')),
    apps: path.resolve(path.join(__dirname, './apps.js')),
    'router-org-page': path.resolve(path.join(__dirname, './router-org-page.js')),
    'router-userhome': path.resolve(path.join(__dirname, './router-userhome.js')),
    'chat-message-reports': path.resolve(path.join(__dirname, './chat-message-reports.js')),

    'mobile-native-userhome': path.resolve(path.join(__dirname, './mobile-native-userhome')),
    'router-home-learn': path.resolve(path.join(__dirname, './router-home-learn'))
  },
  output: {
    path: path.resolve(__dirname, '../../output/assets/js/'),
    filename: '[name].bundle.js',
    chunkFilename: '[name].chunk.js',
    publicPath: '/_s/l/js/',
    devtoolModuleFilenameTemplate: '[resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[resource-path]?[hash]'
  },
  module: {
    strictExportPresence: true,
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: [/node_modules/],
        options: {
          presets: ['@babel/preset-env']
        }
      },
      {
        test: /\.hbs$/,
        loader: '@gitterhq/handlebars-loader', // disable minify for now + path.resolve(path.join(__dirname, "../../build-scripts/html-min-loader"))
        query: {
          helperDirs: [
            path.dirname(require.resolve('gitter-web-templates/shared/helpers/pluralize'))
          ],
          knownHelpers: ['cdn', 'avatarSrcSet'],
          partialsRootRelative: path.resolve(__dirname, '../templates/partials/') + path.sep
        }
      },
      {
        test: /.css$/,
        use: [
          { loader: 'style-loader', options: { insertAt: 'top' } },
          { loader: 'css-loader', options: { importLoaders: 1 } },
          { loader: 'postcss-loader', options: { plugins: getPostcssStack(webpack) } }
        ]
      }
    ]
  },
  resolve: {
    alias: {
      jquery: require.resolve('jquery'),
      mutant: path.resolve(path.join(__dirname, '../repo/mutant/mutant.js')),
      emojify: path.resolve(path.join(__dirname, '../repo/emojify/emojify.js')),
      'jquery-textcomplete': path.resolve(
        path.join(__dirname, '../repo/jquery-textcomplete/jquery.textcomplete.js')
      ),
      autolink: path.resolve(path.join(__dirname, '../repo/autolink/autolink.js')),
      transloadit: path.resolve(
        path.join(__dirname, '../repo/transloadit/jquery.transloadit2-v2-latest.js')
      ),
      zeroclipboard: path.resolve(path.join(__dirname, '../repo/zeroclipboard/zeroclipboard.js')),
      'jquery-sortable': path.resolve(
        path.join(__dirname, '../repo/jquery-sortable/jquery-sortable.js')
      ),

      // Prevent duplicates
      moment: path.resolve(path.join(__dirname, 'utils/moment-wrapper')),
      underscore: path.resolve(path.join(__dirname, 'utils/underscore-wrapper')),
      backbone: path.resolve(path.join(__dirname, '../../node_modules/backbone')),

      bluebird: path.resolve(path.join(__dirname, 'utils/bluebird-wrapper'))
    }
  },
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      maxInitialRequests: 4,
      cacheGroups: {
        default: false,
        vendor: {
          name: 'vendor',
          chunks: 'all',
          // Minimum number of chunks that must share a module before splitting
          minChunks: 2,
          // `d3` is only used by `@gitterhq/cal-heatmap` so let's put it in the specific archive chunk
          test: /[\\/]node_modules[\\/](?!d3)/
        }
      }
    }
  },
  plugins: [
    new StatsWriterPlugin({
      filename: 'webpack-manifest.json',
      transform: function(data, opts) {
        const stats = opts.compiler.getStats().toJson({
          chunkModules: false,
          source: false,
          chunks: false,
          modules: false,
          assets: true
        });
        return JSON.stringify(stats, null, 2);
      }
    }),

    new ProvidePlugin({ Promise: 'bluebird' }),

    new ContextReplacementPlugin(
      /moment[/\\]locale$/,
      /ar|cs|da|de|en-gb|es|fa|fr|hu|it|ja|ko|lt|nl|pl|pt|ru|sk|sv|ua|zh-cn/
    ),

    // optionally generate webpack bundle analysis
    WEBPACK_REPORT &&
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        generateStatsFile: true,
        openAnalyzer: false,
        reportFilename: path.join(ROOT_PATH, 'webpack-report/index.html'),
        statsFilename: path.join(ROOT_PATH, 'webpack-report/stats.json')
      })
  ].filter(Boolean),
  bail: true
};

if (IS_PRODUCTION) {
  webpackConfig.devtool = 'source-map';
} else {
  // See http://webpack.github.io/docs/configuration.html#devtool
  webpackConfig.devtool = 'cheap-source-map';
  webpackConfig.cache = true;
}

if (process.env.WEBPACK_VISUALIZER) {
  var Visualizer = require('webpack-visualizer-plugin');
  webpackConfig.plugins.push(new Visualizer({ filename: '../../webpack.stats.html' }));
}

module.exports = webpackConfig;
