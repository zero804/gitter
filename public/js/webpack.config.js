/* jshint node:true */
'use strict';

var path = require('path');

var ExtractTextPlugin = require("extract-text-webpack-plugin");
var CommonsChunkPlugin = require("webpack/lib/optimize/CommonsChunkPlugin");

var webpack = {
  entry: './router-nli-app.js',
  output: {
    filename: "[name].entry.chunk.js"
  },
  module: {
    loaders: [{
        test: /^log!/,
        loader: function(source) {
          console.log('SOURCE: ', source);
          return "";
        }
      },{
        test: /\.hbs$/,
        loader: "handlebars-loader"
      }
    ]
  },
  resolve: {
    alias: {
      "hbs": "handlebars-loader",
      "utils": path.resolve(path.join(__dirname, "/utils/")),
      "views": path.resolve(path.join(__dirname, "./views/")),
      "components": path.resolve(path.join(__dirname, "./components")),
      "template": path.resolve(path.join(__dirname, "./template")),
      "bootstrap_tooltip": path.resolve(path.join(__dirname, "./utils/tooltip.js")),
      "jquery": path.resolve(path.join(__dirname, "../repo/jquery/jquery.js")),
      "handlebars": path.resolve(path.join(__dirname, "../repo/hbs/Handlebars.js")),
      "raven": path.resolve(path.join(__dirname, "../repo/raven/raven.js")),
      "marionette": path.resolve(path.join(__dirname, "../repo/marionette/marionette.js")),
      "mutant": path.resolve(path.join(__dirname, "../repo/mutant/mutant.js")),
      "backbone.wreqr": path.resolve(path.join(__dirname, "../repo/backbone.wreqr/backbone.wreqr.js")),
      "backbone.babysitter": path.resolve(path.join(__dirname, "../repo/backbone.babysitter/backbone.babysitter.js")),
      "backbone": path.resolve(path.join(__dirname, "../repo/backbone/backbone.js"))
    }
  },
  plugins: [
    new CommonsChunkPlugin("commons.chunk.js")
    // new ExtractTextPlugin("moo.css")
  ]
};

console.log(webpack);

module.exports = webpack;
