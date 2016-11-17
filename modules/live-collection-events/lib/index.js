'use strict';

var EventEmitter = require('events').EventEmitter;

module.exports = {
  events: new EventEmitter(),
  chats: new EventEmitter(),
  rooms: new EventEmitter(),
  roomMembers: new EventEmitter(),
  users: new EventEmitter(),
  userGroups: new EventEmitter(),
  groupMembers: new EventEmitter(),
  topics: new EventEmitter(),
  replies: new EventEmitter(),
  comments: new EventEmitter(),
  categories: new EventEmitter()
};
