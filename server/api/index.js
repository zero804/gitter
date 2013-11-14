/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";


module.exports = {
  install: function(app) {
    require('./v1/').install(app);
    require('./private/').install(app);
  }
};