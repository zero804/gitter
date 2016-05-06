"use strict";

var path                     = require("path");
var CommonsChunkPlugin       = require("webpack/lib/optimize/CommonsChunkPlugin");
var ContextReplacementPlugin = require("webpack/lib/ContextReplacementPlugin");

var getPostcssStack = require('gitter-styleguide/postcss-stack');

var devMode = process.env.WEBPACK_DEV_MODE === '1';

var webpackConfig = {
  entry: {
    "router-nli-app": path.resolve(path.join(__dirname, "./router-nli-app.js")),
    "router-nli-chat": path.resolve(path.join(__dirname, "./router-nli-chat.js")),
    "router-app": path.resolve(path.join(__dirname, "./router-app.js")),
    "router-chat": path.resolve(path.join(__dirname, "./router-chat.js")),
    "explore": path.resolve(path.join(__dirname, "./explore.js")),
    "router-login": path.resolve(path.join(__dirname, "./router-login.js")),
    "just-tracking": path.resolve(path.join(__dirname, "./just-tracking.js")),
    // plain module requires need to be in an array: https://github.com/webpack/webpack/issues/300
    "frame-utils": [path.resolve(path.join(__dirname, "./utils/frame-utils.js"))],
    "mobile-userhome": path.resolve(path.join(__dirname, "./mobile-userhome.js")),
    "mobile-nli-app": path.resolve(path.join(__dirname, "./mobile-nli-app.js")),
    "mobile-app": path.resolve(path.join(__dirname, "./mobile-app")),
    "router-archive-chat": path.resolve(path.join(__dirname, "./router-archive-chat")),
    "router-archive-home": path.resolve(path.join(__dirname, "./router-archive-home")),
    "router-archive-links": path.resolve(path.join(__dirname, "./router-archive-links")),
    "router-embed-chat": path.resolve(path.join(__dirname, "./router-embed-chat")),
    "router-nli-embed-chat": path.resolve(path.join(__dirname, "./router-nli-embed-chat")),
    "homepage": path.resolve(path.join(__dirname, "./homepage")),
    "apps": path.resolve(path.join(__dirname, "./apps.js")),
    "router-org-page": path.resolve(path.join(__dirname, './router-org-page.js')),
    "router-userhome": path.resolve(path.join(__dirname, './router-userhome.js')),

    "mobile-native-userhome": path.resolve(path.join(__dirname, "./mobile-native-userhome")),

    vendor: [
      'utils/webpack',
      'utils/context',
      'underscore',
      'jquery',
      'backbone',
      'backbone.marionette',
      'loglevel',
      'utils/log',
      'handlebars/runtime',
      'gitter-realtime-client',
      'raven-js',
      'keymaster',
      'moment',
      'bluebird'
    ]
  },
  output: {
    path: path.resolve(__dirname, "../../output/assets/js/"),
    filename: "[name].js",
    chunkFilename: "[id].chunk.js",
    publicPath: "/_s/l/js/",
    devtoolModuleFilenameTemplate: "[resource-path]",
    devtoolFallbackModuleFilenameTemplate: "[resource-path]?[hash]"
  },
  module: {
    //JP 12/1/16 If you add a loader remember to add it to /test/in-browser/webpack.config.js
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
          partialsRootRelative: path.resolve(__dirname, '../templates/partials/') + path.sep
        }
      },
      {
        test:    /.css$/,
        loader:  'style-loader?insertAt=top!css-loader!postcss-loader',
      },
    ]
  },
  resolve: {
    alias: {
      "utils": path.resolve(path.join(__dirname, "/utils/")),
      // "shared": path.resolve(path.join(__dirname, "../../shared/")),
      "views": path.resolve(path.join(__dirname, "./views/")),
      "collections": path.resolve(path.join(__dirname, "./collections")),
      "components": path.resolve(path.join(__dirname, "./components")),
      "template": path.resolve(path.join(__dirname, "./template")),
      "bootstrap_tooltip": path.resolve(path.join(__dirname, "./utils/tooltip.js")),
      "jquery": path.resolve(path.join(__dirname, "../repo/jquery/jquery.js")),
      "mutant": path.resolve(path.join(__dirname, "../repo/mutant/mutant.js")),
      "cocktail": path.resolve(path.join(__dirname, "../repo/cocktail/cocktail.js")),
      "keymaster": path.resolve(path.join(__dirname, "../repo/keymaster/keymaster.js")),
      "emojify": path.resolve(path.join(__dirname, "../repo/emojify/emojify.js")),
      "jquery-iframely": path.resolve(path.join(__dirname, "../repo/jquery-iframely/jquery-iframely.js")),
      "jquery-textcomplete": path.resolve(path.join(__dirname, "../repo/jquery-textcomplete/jquery.textcomplete.js")),
      "autolink": path.resolve(path.join(__dirname, "../repo/autolink/autolink.js")),
      "transloadit": path.resolve(path.join(__dirname, "../repo/transloadit/jquery.transloadit2-v2-latest.js")),
      "zeroclipboard": path.resolve(path.join(__dirname, "../repo/zeroclipboard/zeroclipboard.js")),
      "backbone-sorted-collection": path.resolve(path.join(__dirname, "../repo/backbone-sorted-collection/backbone-sorted-collection.js")),
      "jquery-sortable": path.resolve(path.join(__dirname, "../repo/jquery-sortable/jquery-sortable.js")),
      "d3": path.resolve(path.join(__dirname, "../repo/d3/d3.js")),

      // Prevent duplicates
      "moment": path.resolve(path.join(__dirname, "utils/moment-wrapper")),
      "underscore": path.resolve(path.join(__dirname, "utils/underscore-wrapper")),
      "backbone": path.resolve(path.join(__dirname, "../../node_modules/backbone")),

      "bluebird": path.resolve(path.join(__dirname, "utils/bluebird-wrapper"))
    },
  },
  plugins: [
    new CommonsChunkPlugin("vendor", "[name].js"),
    new ContextReplacementPlugin(/moment\/locale$/, /ar|cs|da|de|en-gb|es|fr|it|ja|ko|nl|pl|pt|ru|sv|zh-cn/)
  ],
  bail: true,
  recordsPath: '/tmp/records.json',
  postcss: function(webpack) {
    return getPostcssStack(webpack);
  },
};

if(devMode) {
  // See http://webpack.github.io/docs/configuration.html#devtool
  webpackConfig.devtool = 'cheap-source-map';
  webpackConfig.cache = true;
} else {
  webpackConfig.devtool = 'source-map';

}
module.exports = webpackConfig;
