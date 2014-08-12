/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var moment = require('moment');
var appMiddleware = require('./middleware');
var chatService = require('../../services/chat-service');
var restSerializer = require('../../serializers/rest-serializer');
var contextGenerator = require('../../web/context-generator');
var Q = require('q');
var roomService = require('../../services/room-service');
var env              = require('../../utils/env');
var roomCapabilities = require('../../services/room-capabilities');
var burstCalculator   = require('../../utils/burst-calculator');
var roomPermissionsModel = require('../../services/room-permissions-model');

exports.datesList = [
  appMiddleware.uriContextResolverMiddleware,
  function(req, res, next) {
    var user = req.user;
    var troupe = req.uriContext.troupe;

    return roomService.validateRoomForReadOnlyAccess(user, troupe)
      .then(function() {
        var troupe = req.uriContext.troupe;

        // This is where we want non-logged-in users to return
        if(!user && req.session) {
          req.session.returnTo = '/' + troupe.uri;
        }

        var roomUrl = '/api/v1/rooms/' + troupe.id;

        return roomPermissionsModel(user, 'admin', troupe)
          .then(function(access) {

            return contextGenerator.generateTroupeContext(req)
              .then(function(troupeContext) {

                res.render('archive-home-template', {
                  layout: 'archive',
                  user: user,
                  isAdmin: access,
                  archives: true,
                  troupeContext: troupeContext,
                  bootScriptName: 'router-archive-home',
                  cssFileName: 'scripts/router-archive-home.css',
                  troupeTopic: troupe.topic,
                  githubLink: '/' + req.uriContext.uri,
                  troupeName: req.uriContext.uri,
                  isHomePage: true,
                  noindex: troupe.noindex,
                  roomUrl: roomUrl,
                  accessToken: req.accessToken,
                  public: troupe.security === 'PUBLIC'
                });

              });
          });
      })
      .fail(next);
  }
];

exports.chatArchive = [
  appMiddleware.uriContextResolverMiddleware,
  function(req, res, next) {
    var user = req.user;
    var troupe = req.uriContext.troupe;

    return roomService.validateRoomForReadOnlyAccess(user, troupe)
      .then(function() {

        // This is where we want non-logged-in users to return
        if(!user && req.session) {
          req.session.returnTo = '/' + troupe.uri;
        }

        var yyyy = parseInt(req.params.yyyy, 10);
        var mm = parseInt(req.params.mm, 10);
        var dd = parseInt(req.params.dd, 10);

        var startDate = moment(yyyy + "-" + mm + "-" + dd + "Z");
        var endDate = moment(startDate).endOf('day');

        var troupeId = troupe.id;

        var nextDate = moment(startDate).add('days', 1);
        var previousDate = moment(startDate).subtract('days', 1);

        var today = moment().endOf('day');
        if(moment(nextDate).endOf('day').isAfter(today)) {
          nextDate = null;
        }

        if(moment(previousDate).startOf('day').isBefore(moment([2013, 11, 1]))) {
          previousDate = null;
        }



        return chatService.findChatMessagesForTroupeForDateRange(troupeId, startDate.toDate(), endDate.toDate())
          .spread(function(chatMessages, limitReached) {

            var strategy = new restSerializer.ChatStrategy({
              notLoggedIn: true,
              troupeId: troupeId
            });

            return Q.all([
                contextGenerator.generateTroupeContext(req),
                restSerializer.serializeQ(chatMessages, strategy),
                limitReached
              ]);
          })
          .spread(function(troupeContext, serialized, limitReached) {
            troupeContext.archive = {
              archiveDate: startDate,
              nextDate: nextDate,
              previousDate: previousDate
            };

            var language = req.headers['accept-language'];
            if(language) {
              language = language.split(';')[0].split(',');
            } else {
              language = 'en-uk';
            }

            var p = previousDate && moment(previousDate);
            var n = nextDate && moment(nextDate);
            var uri = req.uriContext.uri;

            var ordinalDate = moment(startDate).format('Do', { lang: language });
            var numericDate = moment(startDate).format('D', { lang: language });

            var ordinalPart;
            if(ordinalDate.indexOf('' + numericDate) === 0) {
              ordinalPart = ordinalDate.substring(('' + numericDate).length);
            } else {
              ordinalPart = '';
            }

            var previousDateFormatted = p && p.format('Do MMM YYYY', { lang: language });
            var dayNameFormatted = numericDate;
            var dayOrdinalFormatted = ordinalPart;
            var previousDateLink = p && '/' + uri + '/archives/' + p.format('YYYY/MM/DD', { lang: 'en' });
            var nextDateFormatted = n && moment(n.valueOf()).lang(language).format('Do MMM YYYY', { lang: language });
            var nextDateLink = n && '/' + uri + '/archives/' + n.format('YYYY/MM/DD', { lang: 'en' });
            var monthYearFormatted = moment(startDate).format('MMM YYYYY', { lang: language });

            var billingUrl = env.config.get('web:billingBaseUrl') + '/bill/' + req.uriContext.uri.split('/')[0];
            var roomUrl = '/api/v1/rooms/' + troupe.id;

            return roomCapabilities.getPlanType(troupe.id).then(function(plan) {
              var historyHorizon = roomCapabilities.getMessageHistory(plan);

              return res.render('chat-archive-template', {
                layout: 'archive',
                archives: true,
                archiveChats: true,
                isRepo: troupe.githubType === 'REPO',
                bootScriptName: 'router-archive-chat',
                cssFileName: 'scripts/router-archive-chat.css',
                githubLink: '/' + req.uriContext.uri,
                user: user,
                troupeContext: troupeContext,
                troupeName: req.uriContext.uri,
                troupeTopic: troupe.topic,
                chats: burstCalculator(serialized),
                limitReached: limitReached,
                historyHorizon: historyHorizon,
                billingUrl: billingUrl,
                noindex: troupe.noindex,
                roomUrl: roomUrl,
                accessToken: req.accessToken,

                /* For prerendered archive-navigation-view */
                previousDate: previousDateFormatted,
                dayName: dayNameFormatted,
                dayOrdinal: dayOrdinalFormatted,
                previousDateLink: previousDateLink,
                nextDate: nextDateFormatted,
                nextDateLink: nextDateLink,
                monthYearFormatted: monthYearFormatted
              });

            });

          });
      })
      .fail(next);
  }
];
