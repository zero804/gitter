#!/usr/bin/env node
'use strict';

var env = require('gitter-web-env');
var config = env.config;
var Promise = require('bluebird');
var yargs = require('yargs');
var StatusError = require('statuserror');
var utils = require('./fixture-script-utils');
var RealtimeClient = require('gitter-realtime-client').RealtimeClient;
var oauthService = require('../../server/services/oauth-service');


var opts = yargs
  .option('username', {
    required: true,
    description: 'username of the user doing the listening'
  })
  .option('group', {
    required: true,
    description: 'group uri of the group containing the forum'
  })
  .option('topic', {
    required: false,
    description: 'id of the topic you want to listen to'
  })
  .option('reply', {
    required: false,
    description: 'id of the reply you want to listen to'
  })
  .help('help')
  .alias('help', 'h')
  .argv;


  return Promise.join(
      utils.getUser(opts.username),
      utils.getForum(opts.group))
    .bind({})
    .spread(function(user, forum) {
      if (!user) throw new StatusError(404, 'User not found.');
      if (!forum) throw new StatusError(404, 'Forum not found.');

      this.user = user;
      this.forum = forum;

      return oauthService.findOrGenerateWebToken(user.id);
    })
    .spread(function(token, webClient) {
      var forum = this.forum;

      var client = new RealtimeClient({
        token: token,
        fayeUrl: config.get('ws:fayeUrl')
      });

      var forumId = forum._id;

      client.subscribe('/v1/forums/' + forumId, onMessage);
      client.subscribe('/v1/forums/' + forumId + '/topics', onMessage);
      if (opts.topic) {
        var topicId = opts.topic;
        client.subscribe('/v1/forums/' + forumId + '/topics/' + topicId + '/replies', onMessage);
        if (opts.reply) {
          var replyId = opts.reply;
          client.subscribe('/v1/forums/' + forumId + '/topics/' + topicId + '/replies/' + replyId, onMessage);
        }
      }
    });


function onMessage(message) {
  console.log(message);
}

