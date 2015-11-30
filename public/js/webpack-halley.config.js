/* jshint node:true */
"use strict";

var path              = require("path");
var _                 = require('lodash');
var mainWebpackConfig = require('./webpack.config');
var DefinePlugin      = require("webpack/lib/DefinePlugin");

var halleyConfig = _.extend({
}, mainWebpackConfig);


// Deep clone resolve.alias
halleyConfig.resolve.alias = _.extend({ }, halleyConfig.resolve.alias, {
  'gitter-realtime-client': path.resolve(path.join(__dirname, "../../node_modules/gitter-realtime-client-halley-TEMP")),
  "bluebird": path.resolve(path.join(__dirname, "../../node_modules/bluebird")),  
});


halleyConfig.plugins = halleyConfig.plugins.filter(function(f) {
  return !(f instanceof DefinePlugin);
});

halleyConfig.plugins.push(new DefinePlugin({
  USE_HALLEY: JSON.stringify(true)
}));

module.exports = halleyConfig;
