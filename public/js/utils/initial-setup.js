'use strict';

var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var FontFaceObserver = require('fontfaceobserver');

module.exports = (function () {
  if (window.__agent) {
    window.__agent.start(Backbone, Marionette);
  }

  var font = new FontFaceObserver('source-sans-pro');

  font.load().then(function () {
    document.body.classList.add('fonts-loaded');
  });

})();

