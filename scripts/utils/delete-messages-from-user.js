#!/usr/bin/env node
'use strict';

var Promise = require('bluebird');
var shutdown = require('shutdown');
var path = require('path');
var fs = require('fs-extra');
var outputFile = Promise.promisify(fs.outputFile);
var temp = require('temp');
var mkdir = Promise.promisify(temp.mkdir);

var onMongoConnect = require('../../server/utils/on-mongo-connect');
var userService = require('../../server/services/user-service');
var chatService = require('../../server/services/chat-service');
var chatsForUserSearch = require('gitter-web-elasticsearch/lib/chats-for-user-search');

var opts = require('yargs')
  .option('username', {
    alias: 'u',
    required: true,
    description: 'Username of the user to remove'
  })
  .option('limit', {
    alias: 'l',
    required: true,
    default: 100,
    description: 'Number of documents to find and delete'
  })
  .option('grep', {
    alias: 'g',
    description: 'The regex filter to match against the message text'
  })
  .option('dry', {
    type: 'boolean',
    default: false,
    description: 'Dry run: whether to actually delete the messages'
  })
  .help('help')
  .alias('help', 'h')
  .argv;


var messageTextFilterRegex = opts.grep ? new RegExp(opts.grep, 'i') : null;


if(opts.dry) {
  console.log('Dry-run: nothing will be deleted/saved');
}

var clearMessages = onMongoConnect()
  .then(function() {
    return userService.findByUsername(opts.username);
  })
  .then(function(user) {
    if(!user) {
      console.error('Could not find user with', opts.username);
      return;
    }

    return chatsForUserSearch.searchChatsForUserId(user.id, {
      limit: opts.limit
    });
  })
  .then(function(response) {
    var hits = (response && response.hits && response.hits.hits) ? response.hits.hits : [];
    console.log('Found ' + hits.length + ' messages');

    var filteredHits = hits;
    if(messageTextFilterRegex) {
      filteredHits = hits.filter(function(hit) {
          return hit._source && hit._source.text && hit._source.text.match(messageTextFilterRegex);
        });
    }

    var messageIds = filteredHits.map(function(hit) {
        return hit._id;
      });

    var getMessages = chatService.findByIds(messageIds);

    var getExistentMesssages = getMessages.then(function(messages) {
      return messages.filter(function(message) {
        return !!message;
      });
    });

    return getExistentMesssages.then(function(messages) {
      console.log('Working with', messages.length + '/' + messageIds.length);

      var now = new Date();
      var filename = 'messages-' + opts.username + '-bak-' + now.getFullYear() + '-' + now.getMonth() + '-' + now.getDate() + '--' + now.getTime() + '.json';
      var saveLog = mkdir('gitter-delete-message-bak')
        .then(function(dir) {
          var filePath = path.join(dir, filename);
          console.log('Saving log to:', filePath);
          return outputFile(filePath, JSON.stringify(messages, null, 2));
        });

      var clearMessages = messages.map(function(message) {
        message.set({
          text: '',
          html: ''
        });

        if(!opts.dry) {
          return message.save();
        }
      });

      return Promise.all([saveLog, clearMessages]);
    });
    /* */

  });


clearMessages
  .delay(2000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error('Error: ' + err, err);
    shutdown.shutdownGracefully(1);
  })
  .done();
