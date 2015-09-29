"use strict";

var context = require('utils/context');
var Marionette = require('backbone.marionette');
var behaviourLookup = require('./lookup');

var loggedIn = context.isLoggedIn();

var transitionQueue = [];
var highwaterMark = 0;

function queueTransition(el) {
  transitionQueue.push(el);
  if (transitionQueue.length === 1) {
    setTimeout(dequeueTransition, 500);
  }
}

function dequeueTransition() {
  var el = transitionQueue.shift();
  if (!el) return;

  if (highwaterMark < transitionQueue.length) {
    highwaterMark = transitionQueue.length;
  }

  var classList = el.classList;
  classList.remove('unread');

  if (transitionQueue.length) {
    var time = highwaterMark > 10 ? 60 : 70;
    setTimeout(dequeueTransition, time);
  } else {
    highwaterMark = 0;
  }
}

var Behavior = Marionette.Behavior.extend({
  modelEvents: {
    'change:unread': 'unreadChanged'
  },

  onRender: function() {
    if(!loggedIn) return;

    var model = this.view.model;
    if(!model) return;

    var unread = model.get('unread');
    if(unread) {
      this.el.classList.add('unread');
    }
  },

  unreadChanged: function(model) {
    if (model.get('unread')) return; // Changed to read? Don't know how to handle that yet...
    var previous = model.previous('unread');
    if (!previous) return; // On send, unread is undefined. Ignore changes from undefined to false
    queueTransition(this.el);
  }
});

behaviourLookup.register('UnreadItems', Behavior);
module.exports = Behavior;
