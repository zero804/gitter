/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var moment = require('moment');
var appMiddleware     = require('./middleware');
var chatService = require('../../services/chat-service');
var restSerializer = require('../../serializers/rest-serializer');
var contextGenerator = require('../../web/context-generator');
var Q = require('q');

module.exports = [
  appMiddleware.uriContextResolverMiddleware,
  function(req, res, next) {

    if(req.uriContext.troupe.security !== 'PUBLIC') {
      // For now, archives for public rooms only
      return next(403);
    }

    var yyyy = parseInt(req.params.yyyy, 10);
    var mm = parseInt(req.params.mm, 10);
    var dd = parseInt(req.params.dd, 10);

    var startDate = moment(yyyy + "-" + mm + "-" + dd + "Z").valueOf();
    var endDate = startDate + 86400000 - 1;

    var troupe = req.uriContext.troupe;
    var troupeId = troupe.id;

    chatService.findChatMessagesForTroupeForDateRange(troupeId, startDate, endDate)
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
      .then(function(troupeContext, serialized) {

        var githubLink;

        if(troupe.githubType === 'REPO' || troupe.githubType === 'ORG') {
          githubLink = 'https://github.com/' + req.uriContext.uri;
        }

        res.render('chat-nli-template', {
          isRepo: troupe.githubType === 'REPO',
          bootScriptName: 'router-nli-chat',
          githubLink: githubLink,
          troupeName: req.uriContext.uri,
          troupeTopic: troupe.topic,
          chats: serialized,
          agent: req.headers['user-agent']
        });

      })
      .fail(next);
  }
];