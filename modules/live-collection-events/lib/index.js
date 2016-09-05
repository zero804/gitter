'use strict';

var EventEmitter = require('events').EventEmitter;

var handlers = [
  'events',
  'chats',
  'rooms',
  'roomMembers',
  'users',
  'groupMembers',
  'topics',
  'replies'
];

var emitters = handlers.reduce(function(memo, category) {
    var emitter = new EventEmitter();
    memo[category] = emitter;
    return memo;
  }, {});

module.exports = emitters;
