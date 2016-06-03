'use strict';

var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var FontFaceObserver = require('fontfaceobserver');
var RAF = require('utils/raf');

module.exports = (function () {
  if (window.__agent) {
    window.__agent.start(Backbone, Marionette);
  }

  //We only want to observer events for the default font
  var font = new FontFaceObserver('source-sans-pro', {
    weight: 'normal',
  });

  font.load().then(function () {
    RAF(function(){
      document.documentElement.className += " fonts-loaded";
    });
  });

})();
