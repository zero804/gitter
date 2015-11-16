/* jshint node:true */
"use strict";

var path              = require("path");
var _                 = require('lodash');
var mainWebpackConfig = require('./webpack.config');

var halleyConfig = _.extend({
}, mainWebpackConfig);


// Deep clone resolve.alias
halleyConfig.resolve.alias = _.extend({ }, halleyConfig.resolve.alias, {
  'gitter-realtime-client': path.resolve(path.join(__dirname, "../../node_modules/gitter-realtime-client-halley-TEMP"))
});

module.exports = halleyConfig;
