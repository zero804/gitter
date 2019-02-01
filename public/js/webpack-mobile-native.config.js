'use strict';

var path = require('path');
var _ = require('lodash');
var mainWebpackConfig = require('./webpack.config');

var mobileConfig = _.extend({}, mainWebpackConfig);

mobileConfig.entry = {
  'mobile-native-embedded-chat': path.resolve(
    path.join(__dirname, './mobile-native-embedded-chat')
  ),
  vendor: mainWebpackConfig.entry.vendor
};

mobileConfig.plugins = mobileConfig.plugins.slice();

module.exports = mobileConfig;
