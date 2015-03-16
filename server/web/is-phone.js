/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var parser = require('useragent');

var isPhone = function(userAgentString) {
  var agent = parser.parse(userAgentString);
  var device = agent.device;

  if(device && device.family === 'iPad') return false;

  return userAgentString && userAgentString.toLowerCase().indexOf('mobile') >= 0;
};

module.exports = isPhone;
