'use strict';

var appEvents = require('./appevents');
var Hammer = require('hammerjs');
var hammer;

function tapHandle(e) {
  appEvents.trigger('ui:tap', e);
}

function swipeLeftHandle(e) {
  appEvents.trigger('ui:swipeleft', e);
}

function swipeRightHandle(e) {
  appEvents.trigger('ui:swiperight', e);
}

function init() {
  if (hammer) return;

  hammer = new Hammer(document.body);

  hammer.on('tap', tapHandle);
  hammer.on('swipeleft', swipeLeftHandle);
  hammer.on('swiperight', swipeRightHandle);
}

module.exports = {
  init: init
};
