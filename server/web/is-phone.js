/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var parser = require('useragent');

var isPhone = function(userAgentString) {
  var agent = parser.parse(userAgentString);
  var device = agent.device;
  var os = agent.os;

  return device && (device.family === 'iPhone' || device.family === 'iPod') ||
    os && os.family === 'Android';
};

module.exports = isPhone;
