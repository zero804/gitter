/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var parser = require('useragent');

var userAgentStats = function(userAgentString) {

  var ua = parser.parse(userAgentString);
  var os = ua.os;

  if(os && (os.family === 'Android' || os.family == 'iOS')) {
    return {
      mobile_os: os.family,
      mobile_browser: ua.family
    };
  }

  return {
    desktop_os: os.family,
    desktop_browser: ua.family
  };
};

module.exports = userAgentStats;