/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

exports.install = function() {
  ['./room-permissions-change-listener', './org-listener'].forEach(function(module) {
    require(module).install();
  });
};
