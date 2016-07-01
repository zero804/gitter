#!/usr/bin/env node
'use strict';

var Promise = require('bluebird');
var shutdown = require('shutdown');
var path = require('path');
var fs = require('fs-extra');
var outputFile = Promise.promisify(fs.outputFile);
var temp = require('temp');
var mkdir = Promise.promisify(temp.mkdir);

var userService = require('../../server/services/user-service');
var chatService = require('../../server/services/chat-service');
var client = require('../../server/utils/elasticsearch-client');


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
  .help('help')
  .alias('help', 'h')
  .argv;

var getQuery = userService.findByUsername(opts.username)
  .then(function(user) {
    if(!user) {
      console.error('Could not find user with', opts.username);
      return;
    }

    var queryRequest = {
      timeout: 500,
      index: 'gitter-primary',
      type: 'chat',
      body: {
        query: {
          "bool": {
            "must": [
              {
                "term": {
                  "fromUserId": user.id
                }
              }
            ],
            "must_not": [],
            "should": []
          }
        },
        "from": 0,
        "size": opts.limit,
        "sort": [],
        "aggs": {}
      }
    };

    return queryRequest;
  });


var clearMessages = getQuery.then(function(queryRequest) {
    return Promise.resolve(client.search(queryRequest))
  })
  .then(function(response) {
    var messageIds = response.hits.hits.map(function(hit) {
      return hit._id;
    });
    console.log('Clearing', messageIds.length, messageIds);

    /* */
    var getMessages = Promise.all(messageIds.map(function(messageId) {
      return chatService.findById(messageId);
    }));


    return getMessages.then(function(messages) {
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

        return message.save();
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
