/* jshint node:true */
"use strict";

var path                     = require("path");
var _                        = require('lodash');
var mainWebpackConfig        = require('./webpack.config');

var mobileConfig = _.extend({}, mainWebpackConfig);

// R
mobileConfig.entry = {
  "mobile-native-embedded-chat": path.resolve(path.join(__dirname, "./mobile-native-embedded-chat")),
  "mobile-native-userhome": path.resolve(path.join(__dirname, "./mobile-native-userhome")),
  vendor: mainWebpackConfig.entry.vendor
};

module.exports = mobileConfig;
