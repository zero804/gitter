'use strict';

var env = require('gitter-web-env');
var config = env.config;
var logger = env.logger;
var errorReporter = env.errorReporter;
var liveCollectionEvents = require('gitter-web-live-collection-events');

// This is a bit crazy, but we need to get around node circular references
var handlers = {
  events: './live-collection-events',
  chats: './live-collection-chats',
  rooms: './live-collection-rooms',
  roomMembers: './live-collection-room-members',
  users: './live-collection-users',
  groupMembers: './live-collection-group-members'
};

if (config.get('topics:useApi')) {
  handlers.topics = './live-collection-topics';
  handlers.replies = './live-collection-replies';
  handlers.comments = './live-collection-comments';
  // TODO: categories? forums?
}

module.exports = {
  install: install
}

var installed = false;
function install() {
  if (installed) return;
  installed = true;

  Object.keys(handlers).forEach(function(category) {
    var handlerModuleName = handlers[category];
    var emitter = liveCollectionEvents[category];

    // Don't load the library until install is called otherwise
    // we'll introduce circular references
    var lib = require(handlerModuleName); // Load the handler

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
