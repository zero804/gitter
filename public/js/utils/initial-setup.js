/* globals USE_HALLEY:false */
'use strict';

var Backbone = require('backbone');
var Marionette = require('backbone.marionette');

if (USE_HALLEY) {
  var Promise = require('bluebird');
  var browserSetImmediate = require('setimmediate');
  Promise.setScheduler(browserSetImmediate.setImmediate);
}

module.exports = (function () {
  if (window.__agent) {
    window.__agent.start(Backbone, Marionette);
  }
})();
