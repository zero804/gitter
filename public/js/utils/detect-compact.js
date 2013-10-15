/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define(function() {
  "use strict";

  return function detectCompact() {
    return !!navigator.userAgent.match(/(iPhone|iPod|Android|BlackBerry)/);
  };

});
