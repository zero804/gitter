'use strict';
var Backbone = require('backbone');
var Marionette = require('marionette');

module.exports = (function () {
  if (window.__agent) {
    window.__agent.start(Backbone, Marionette);
  }
})();
