/* jshint node:true */

"use strict";
var path = require("path");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var CommonsChunkPlugin = require("webpack/lib/optimize/CommonsChunkPlugin");
var webpack = {
  entry: {
    "router-nli-app": path.resolve(path.join(__dirname, "./router-nli-app.js")),
    "router-nli-chat": path.resolve(path.join(__dirname, "./router-nli-chat.js")),
    vendor: ['utils/context',
      'underscore',
      'jquery',
      'backbone',
      'marionette',
      'utils/log',
      'utils/tracking',
      'backbone.wreqr',
      'backbone.babysitter',
      'handlebars/runtime',
      'raven',
      'keymaster'
      ]
  },
  output: {
    path: __dirname + "/../dist",
    filename: "[name].js",
    chunkFilename: "[id].js",
    publicPath: "/assets/"
  },
  module: {
    loaders: [
      {
        test: /\.hbs$/,
        loader: "handlebars-loader"
      },
      {
        test: /\.less$/,
        loader: ExtractTextPlugin.extract("file-loader")
      }
    ]
  },
  resolve: {
    alias: {
      "utils": path.resolve(path.join(__dirname, "/utils/")),
      "views": path.resolve(path.join(__dirname, "./views/")),
      "collections": path.resolve(path.join(__dirname, "./collections")),
      "components": path.resolve(path.join(__dirname, "./components")),
      "template": path.resolve(path.join(__dirname, "./template")),
      "bootstrap_tooltip": path.resolve(path.join(__dirname, "./utils/tooltip.js")),
      "jquery": path.resolve(path.join(__dirname, "../repo/jquery/jquery.js")),
      "raven": path.resolve(path.join(__dirname, "../repo/raven/raven.js")),
      "marionette": path.resolve(path.join(__dirname, "../repo/marionette/marionette.js")),
      "mutant": path.resolve(path.join(__dirname, "../repo/mutant/mutant.js")),
      "backbone.wreqr": path.resolve(path.join(__dirname, "../repo/backbone.wreqr/backbone.wreqr.js")),
      "backbone.babysitter": path.resolve(path.join(__dirname, "../repo/backbone.babysitter/backbone.babysitter.js")),
      "backbone": path.resolve(path.join(__dirname, "../repo/backbone/backbone.js")),
      "cocktail": path.resolve(path.join(__dirname, "../repo/cocktail/cocktail.js")),
      "faye": path.resolve(path.join(__dirname, "../repo/faye/faye.js")),
      "keymaster": path.resolve(path.join(__dirname, "../repo/keymaster/keymaster.js")),
      "filtered-collection": path.resolve(path.join(__dirname, "../repo/filtered-collection/filtered-collection.js")),
      "emojify": path.resolve(path.join(__dirname, "../repo/emojify/emojify.js")),
      "jquery-iframely": path.resolve(path.join(__dirname, "../repo/jquery-iframely/jquery-iframely.js")),
      "jquery-textcomplete": path.resolve(path.join(__dirname, "../repo/jquery-textcomplete/jquery.textcomplete.js")),
      "autolink": path.resolve(path.join(__dirname, "../repo/autolink/autolink.js")),
      "transloadit": path.resolve(path.join(__dirname, "../repo/transloadit/jquery.transloadit2-v2-latest.js")),
      "oEmbed": path.resolve(path.join(__dirname, "../repo/oEmbed/oEmbed.js")),
      // "underscore": path.resolve(path.join(__dirname, "../repo/underscore/underscore.js")),
      "moment": path.resolve(path.join(__dirname, "../repo/moment/moment.js"))
    }
  },
  plugins: [
    new CommonsChunkPlugin("vendor", "vendor.bundle.js"),
    new ExtractTextPlugin("[name].css", { allChunks: false })
  ]
};
console.log(JSON.stringify(webpack, null, "  "));
module.exports = webpack;


