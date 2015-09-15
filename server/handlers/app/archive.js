/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var moment               = require('moment');
var appMiddleware        = require('./middleware');
var chatService          = require('../../services/chat-service');
var restSerializer       = require('../../serializers/rest-serializer');
var contextGenerator     = require('../../web/context-generator');
var Q                    = require('q');
var roomService          = require('../../services/room-service');
var env                  = require('gitter-web-env');
var burstCalculator      = require('../../utils/burst-calculator');
var roomPermissionsModel = require('../../services/room-permissions-model');
var timezoneMiddleware   = require('../../web/middlewares/timezone');
var identifyRoute        = require('gitter-web-env').middlewares.identifyRoute;
var resolveRoomAvatarUrl = require('gitter-web-shared/avatars/resolve-room-avatar-url');

exports.datesList = [
  identifyRoute('app-archive-main'),
  appMiddleware.uriContextResolverMiddleware({ create: false }),
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
        var avatarUrl = resolveRoomAvatarUrl(troupe.uri);
        var isPrivate = troupe.security !== "PUBLIC";

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
                  cssFileName: 'styles/router-archive-home.css',
                  troupeTopic: troupe.topic,
                  githubLink: '/' + req.uriContext.uri,
                  troupeName: req.uriContext.uri,
                  isHomePage: true,
                  noindex: troupe.noindex,
                  roomUrl: roomUrl,
                  accessToken: req.accessToken,
                  public: troupe.security === 'PUBLIC',
                  avatarUrl: avatarUrl,
                  isPrivate: isPrivate
                });

              });
          });
      })
      .catch(next);
  }
];


exports.chatArchive = [
  identifyRoute('app-archive-date'),
  appMiddleware.uriContextResolverMiddleware({ create: false }),
  timezoneMiddleware,
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
          .then(function(chatMessages) {

            var strategy = new restSerializer.ChatStrategy({
              unread: false, // All chats are read in the archive
              troupeId: troupeId
            });

            return Q.all([
                contextGenerator.generateTroupeContext(req),
                restSerializer.serialize(chatMessages, strategy)
              ]);
          })
          .spread(function(troupeContext, serialized) {
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

            var startDateLocale = moment(startDate).locale(language);

            var ordinalDate = startDateLocale.format('Do');
            var numericDate = startDateLocale.format('D');



            var ordinalPart;
            if(ordinalDate.indexOf('' + numericDate) === 0) {
              ordinalPart = ordinalDate.substring(('' + numericDate).length);
            } else {
              ordinalPart = '';
            }

            var previousDateFormatted = p && p.locale(language).format('Do MMM YYYY');
            var dayNameFormatted = numericDate;
            var dayOrdinalFormatted = ordinalPart;
            var previousDateLink = p && '/' + uri + '/archives/' + p.format('YYYY/MM/DD');
            var nextDateFormatted = n && moment(n.valueOf()).locale(language).format('Do MMM YYYY');
            var nextDateLink = n && '/' + uri + '/archives/' + n.format('YYYY/MM/DD');
            var monthYearFormatted = startDateLocale.format('MMM YYYYY');

            var billingUrl = env.config.get('web:billingBaseUrl') + '/bill/' + req.uriContext.uri.split('/')[0];
            var roomUrl = '/api/v1/rooms/' + troupe.id;

            var avatarUrl = resolveRoomAvatarUrl(troupe.uri);
            var isPrivate = troupe.security !== "PUBLIC";

            return res.render('chat-archive-template', {
              layout: 'archive',
              archives: true,
              archiveChats: true,
              isRepo: troupe.githubType === 'REPO',
              bootScriptName: 'router-archive-chat',
              cssFileName: 'styles/router-archive-chat.css',
              githubLink: '/' + req.uriContext.uri,
              user: user,
              troupeContext: troupeContext,
              troupeName: req.uriContext.uri,
              troupeTopic: troupe.topic,
              chats: burstCalculator(serialized),
              billingUrl: billingUrl,
              noindex: troupe.noindex,
              roomUrl: roomUrl,
              accessToken: req.accessToken,
              avatarUrl: avatarUrl,
              isPrivate: isPrivate,

              /* For prerendered archive-navigation-view */
              previousDate: previousDateFormatted,
              dayName: dayNameFormatted,
              dayOrdinal: dayOrdinalFormatted,
              previousDateLink: previousDateLink,
              nextDate: nextDateFormatted,
              nextDateLink: nextDateLink,
              monthYearFormatted: monthYearFormatted,

              showDatesWithoutTimezone: true // Timeago widget will render whether or not we know the users timezone
            });

          });
      })
      .catch(next);
  }
];
