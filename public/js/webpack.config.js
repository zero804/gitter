/* jshint node:true */
"use strict";

var path = require("path");
var CommonsChunkPlugin = require("webpack/lib/optimize/CommonsChunkPlugin");
var ContextReplacementPlugin = require("webpack/lib/ContextReplacementPlugin");
var DedupePlugin = require('webpack/lib/optimize/DedupePlugin');
var OccurrenceOrderPlugin = require('webpack/lib/optimize/OccurrenceOrderPlugin');
var UglifyJsPlugin = require('webpack/lib/optimize/UglifyJsPlugin');

var devMode = process.env.WEBPACK_DEV_MODE === '1';

var webpackConfig = {
  entry: {
    "router-nli-app": path.resolve(path.join(__dirname, "./router-nli-app.js")),
    "router-nli-chat": path.resolve(path.join(__dirname, "./router-nli-chat.js")),
    "router-app": path.resolve(path.join(__dirname, "./router-app.js")),
    "router-chat": path.resolve(path.join(__dirname, "./router-chat.js")),
    "explore": path.resolve(path.join(__dirname, "./explore.js")),
    "just-tracking": path.resolve(path.join(__dirname, "./just-tracking.js")),
    "mobile-userhome": path.resolve(path.join(__dirname, "./mobile-userhome.js")),
    "mobile-nli-app": path.resolve(path.join(__dirname, "./mobile-nli-app.js")),
    "mobile-app": path.resolve(path.join(__dirname, "./mobile-app")),
    "mobile-native-embedded-chat": path.resolve(path.join(__dirname, "./mobile-native-embedded-chat")),
    "mobile-native-userhome": path.resolve(path.join(__dirname, "./mobile-native-userhome")),
    "userhome": path.resolve(path.join(__dirname, "./userhome")),
    "router-archive-chat": path.resolve(path.join(__dirname, "./router-archive-chat")),
    "router-archive-home": path.resolve(path.join(__dirname, "./router-archive-home")),
    "router-embed-chat": path.resolve(path.join(__dirname, "./router-embed-chat")),
    "homepage": path.resolve(path.join(__dirname, "./homepage")),
    "apps": path.resolve(path.join(__dirname, "./apps.js")),
    vendor: [
      'utils/webpack',
      'utils/context',
      'underscore',
      'jquery',
      'backbone',
      'backbone.marionette',
      'loglevel',
      'utils/log',
      // 'backbone.wreqr',
      // 'backbone.babysitter',
      'handlebars/runtime',
      'gitter-realtime-client',
      'raven-js',
      'keymaster',
      'moment'
      ]
  },
  output: {
    path: __dirname + "/../../output/assets/js/",
    filename: "[name].js",
    chunkFilename: "[id].chunk.js",
    publicPath: "/_s/l/js/",
    devtoolModuleFilenameTemplate: "[absolute-resource-path]",
  },
  module: {
    loaders: [
      {
        test: /\.hbs$/,
        loader: "handlebars-loader" // disable minify for now + path.resolve(path.join(__dirname, "../../build-scripts/html-min-loader"))
      }
    ]
  },
  resolve: {
    alias: {
      "utils": path.resolve(path.join(__dirname, "/utils/")),
      "shared": path.resolve(path.join(__dirname, "../../shared/")),
      "views": path.resolve(path.join(__dirname, "./views/")),
      "collections": path.resolve(path.join(__dirname, "./collections")),
      "components": path.resolve(path.join(__dirname, "./components")),
      "template": path.resolve(path.join(__dirname, "./template")),
      "bootstrap_tooltip": path.resolve(path.join(__dirname, "./utils/tooltip.js")),
      "jquery": path.resolve(path.join(__dirname, "../repo/jquery/jquery.js")),
      // "marionette": path.resolve(path.join(__dirname, "../repo/marionette/marionette.js")),
      "mutant": path.resolve(path.join(__dirname, "../repo/mutant/mutant.js")),
      // "backbone.wreqr": path.resolve(path.join(__dirname, "../repo/backbone.wreqr/backbone.wreqr.js")),
      // "backbone.babysitter": path.resolve(path.join(__dirname, "../repo/backbone.babysitter/backbone.babysitter.js")),
      "cocktail": path.resolve(path.join(__dirname, "../repo/cocktail/cocktail.js")),
      "keymaster": path.resolve(path.join(__dirname, "../repo/keymaster/keymaster.js")),
      "filtered-collection": path.resolve(path.join(__dirname, "../repo/filtered-collection/filtered-collection.js")),
      "emojify": path.resolve(path.join(__dirname, "../repo/emojify/emojify.js")),
      "jquery-iframely": path.resolve(path.join(__dirname, "../repo/jquery-iframely/jquery-iframely.js")),
      "jquery-textcomplete": path.resolve(path.join(__dirname, "../repo/jquery-textcomplete/jquery.textcomplete.js")),
      "autolink": path.resolve(path.join(__dirname, "../repo/autolink/autolink.js")),
      "transloadit": path.resolve(path.join(__dirname, "../repo/transloadit/jquery.transloadit2-v2-latest.js")),
      "oEmbed": path.resolve(path.join(__dirname, "../repo/oEmbed/oEmbed.js")),
      "zeroclipboard": path.resolve(path.join(__dirname, "../repo/zeroclipboard/zeroclipboard.js")),
      "backbone-sorted-collection": path.resolve(path.join(__dirname, "../repo/backbone-sorted-collection/backbone-sorted-collection.js")),
      "jquery-sortable": path.resolve(path.join(__dirname, "../repo/jquery-sortable/jquery-sortable.js")),
      "nanoscroller": path.resolve(path.join(__dirname, "../repo/nanoscroller/nanoscroller.js")),
      "jquery-hammer": path.resolve(path.join(__dirname, "../repo/hammerjs/jquery.hammer.js")),
      "cal-heatmap": path.resolve(path.join(__dirname, "../repo/cal-heatmap/cal-heatmap.js")),
      "d3": path.resolve(path.join(__dirname, "../repo/d3/d3.js")),

      // Prevent duplicates
      "moment": path.resolve(path.join(__dirname, "utils/moment-wrapper")),
      "underscore": path.resolve(path.join(__dirname, "utils/underscore-wrapper")),
      "backbone": path.resolve(path.join(__dirname, "../../node_modules/backbone")),
    },
  },
  plugins: [
    new CommonsChunkPlugin("vendor", "[name].js"),
    new ContextReplacementPlugin(/moment\/lang$/, /ar|cs|da|de|en-gb|es|fr|it|ja|ko|nl|pl|pt|ru|sv|zh-cn/)
  ],
  bail: true,
  recordsPath: '/tmp/records.json'
};

if(devMode) {
  // See http://webpack.github.io/docs/configuration.html#devtool
  webpackConfig.devtool = 'source-map';
  webpackConfig.cache = true;
} else {
  // webpackConfig.plugins.push(new DedupePlugin());
  // webpackConfig.plugins.push(new OccurrenceOrderPlugin());
  webpackConfig.plugins.push(new UglifyJsPlugin());
}
module.exports = webpackConfig;
