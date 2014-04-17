/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var moment = require('moment');
var appMiddleware     = require('./middleware');
var chatService = require('../../services/chat-service');
var restSerializer = require('../../serializers/rest-serializer');
var contextGenerator = require('../../web/context-generator');
var Q = require('q');

exports.datesList = [
  appMiddleware.uriContextResolverMiddleware,
  function(req, res, next) {
    var user = req.user;

    if(req.uriContext.troupe.security !== 'PUBLIC') {
      // For now, archives for public rooms only
      return next(403);
    }

    var troupe = req.uriContext.troupe;
    var troupeId = troupe.id;

    return contextGenerator.generateTroupeContext(req)
      .then(function(troupeContext) {

        var githubLink;
        if(troupe.githubType === 'REPO' || troupe.githubType === 'ORG') {
          githubLink = 'https://github.com/' + req.uriContext.uri;
        }

        res.render('archive-home-template', {
          layout: 'archive',
          user: user,
          troupeContext: troupeContext,
          bootScriptName: 'router-archive-home',
          troupeTopic: troupe.topic,
          githubLink: githubLink,
          troupeName: req.uriContext.uri,
          dataUrl: '/api/private/chat-heatmap/' + troupeId + '?start={{d:start}}&end={{d:end}}'
        });

      })
      .fail(next);
  }
];

exports.chatArchive = [
  appMiddleware.uriContextResolverMiddleware,
  function(req, res, next) {
    var user = req.user;

    if(req.uriContext.troupe.security !== 'PUBLIC') {
      // For now, archives for public rooms only
      return next(403);
    }

    var yyyy = parseInt(req.params.yyyy, 10);
    var mm = parseInt(req.params.mm, 10);
    var dd = parseInt(req.params.dd, 10);

    var startDate = moment(yyyy + "-" + mm + "-" + dd + "Z");
    var endDate = moment(startDate).endOf('day');

    var nextDate = moment(startDate).add('days', 1);
    var previousDate = moment(startDate).subtract('days', 1);

    var troupe = req.uriContext.troupe;
    var troupeId = troupe.id;

    chatService.findChatMessagesForTroupeForDateRange(troupeId, startDate.toDate(), endDate.toDate())
      .then(function(chatMessages) {
        var strategy = new restSerializer.ChatStrategy({
          notLoggedIn: true,
          troupeId: troupeId
        });

        return Q.all([
            contextGenerator.generateTroupeContext(req),
            restSerializer.serializeQ(chatMessages, strategy)
          ]);
      })
      .spread(function(troupeContext, serialized) {

        var githubLink;

        if(troupe.githubType === 'REPO' || troupe.githubType === 'ORG') {
          githubLink = 'https://github.com/' + req.uriContext.uri;
        }

        res.render('chat-archive-template', {
          layout: 'archive',
          isRepo: troupe.githubType === 'REPO',
          bootScriptName: 'router-archive-chat',
          githubLink: githubLink,
          user: user,
          troupeContext: troupeContext,
          troupeName: req.uriContext.uri,
          troupeTopic: troupe.topic,
          chats: serialized,
          agent: req.headers['user-agent']
        });

      })
      .fail(next);
  }
];