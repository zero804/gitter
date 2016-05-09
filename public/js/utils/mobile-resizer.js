"use strict";
var $ = require('jquery');

module.exports = (function() {


  var pixelsToAllowScrolling = 600;

  var hideAddressBar = function() {
    var $body = $('body');
    $body.height($body.height() + pixelsToAllowScrolling);
    window.scrollTo(0, 1);
    $body.height(window.innerHeight);
  };

  return {
    'hideAddressBar': hideAddressBar
  };

})();

