'use strict';

var env = require('gitter-web-env');
var config = env.config;
var logger = env.logger;
var errorReporter = env.errorReporter;
var EventEmitter = require('events').EventEmitter;

// This is a bit crazy, but we need to get around node circular references
var handlers = {
  events: './live-collection-events',
  chats: './live-collection-chats',
  rooms: './live-collection-rooms',
  roomMembers: './live-collection-room-members',
  users: './live-collection-users',
  groupMembers: './live-collection-group-members'
};

if (config.get('topics:useAPI')) {
  handlers.topics = './live-collection-topics';
  // TODO: categories? forums, replies, comments
}

var emitters;
module.exports = makeEmitters();
module.exports.install = install;

function makeEmitters() {
  emitters = {};
  return Object.keys(handlers).reduce(function(memo, category) {
    var emitter = new EventEmitter();
    emitters[category] = emitter; // SIDE EFFECT!
    memo[category] = emitter;
    return memo;
  }, {});
}

var installed = false;
function install() {
  if (installed) return;
  installed = true;

  Object.keys(emitters).forEach(function(category) {
    var emitter = emitters[category];

    // Don't load the library until install is called otherwise
    // we'll introduce circular references
    var lib = require(handlers[category]); // Load the handler

    Object.keys(lib).forEach(function(eventName) {
      emitter.on(eventName, function() {
        var possiblePromise = lib[eventName].apply(lib, arguments);

        /* Some unimplemented methods don't return anything */
        if (possiblePromise) {
          possiblePromise.catch(function(err) {
            logger.error('live-collection handler failed: ' + err, { exception: err });
            errorReporter(err, { live_collection_handler: 'failed' }, { module: 'live-collection' });
          });
        }
      });
    });
  });

}
