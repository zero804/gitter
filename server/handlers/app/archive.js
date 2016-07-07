"use strict";

var env = require('gitter-web-env');
var identifyRoute = env.middlewares.identifyRoute;

var moment = require('moment');
var uriContextResolverMiddleware = require('../uri-context/uri-context-resolver-middleware');
var chatService = require('../../services/chat-service');
var heatmapService = require('../../services/chat-heatmap-service');
var restSerializer = require('../../serializers/rest-serializer');
var contextGenerator = require('../../web/context-generator');
var Promise = require('bluebird');
var burstCalculator = require('../../utils/burst-calculator');
var timezoneMiddleware = require('../../web/middlewares/timezone');
var dateTZtoUTC = require('gitter-web-shared/time/date-timezone-to-utc');
var beforeTodayAnyTimezone = require('gitter-web-shared/time/before-today-any-timezone');
var debug = require('debug')('gitter:app:app-archive');
var _ = require('underscore');
var StatusError = require('statuserror');
var fonts = require('../../web/fonts');
var getAvatarUrlForUriContext = require('../../web/get-avatar-url-for-uri-context');
var redirectErrorMiddleware = require('../uri-context/redirect-error-middleware');

var ONE_DAY_SECONDS = 60 * 60 * 24; // 1 day
var ONE_DAY_MILLISECONDS = ONE_DAY_SECONDS * 1000;
var ONE_YEAR_SECONDS = 60 * 60 * 24 * 365; // 1 year
var ONE_YEAR_MILLISECONDS = ONE_YEAR_SECONDS * 1000;

var validateRoomForReadOnlyAccess = Promise.method(function(user, policy) {
  return policy.canRead()
    .then(function(access) {
      if (access) return;
      if (!user) throw new StatusError(401); // Very suspect...
      throw new StatusError(404)
    });
})

function generateChatTree(chatActivity) {
  // group things in nested maps
  var yearMap = {};
  _.each(chatActivity, function(count, unixTime) {
    var date = moment(unixTime, "X");
    var year = date.year();
    var month = date.format("MM"); // 01-12
    var day = date.format("DD"); // 01-31
    if (!yearMap[year]) {
      yearMap[year] = {};
    }
    if (!yearMap[year][month]) {
      yearMap[year][month] = {};
    }
    yearMap[year][month][day] = count;
  });
  //console.log(JSON.stringify(yearMap, null, 2));

  // change the nested maps into sorted nested arrays of objects
  var yearArray = [];
  _.each(yearMap, function(monthMap, year) {
    var monthArray = [];
    _.each(monthMap, function(dayMap, month) {
      var dayArray = [];
      _.each(dayMap, function(count, day) {
        dayArray.push({day: day, count: count});
      });
      dayArray = _.sortBy(dayArray, 'day') // not reversed
      var monthName = moment.months()[parseInt(month, 10)-1];
      monthArray.push({month: month, monthName: monthName, days: dayArray}); // monthName?
    });
    monthArray = _.sortBy(monthArray, 'month').reverse();
    yearArray.push({year: year, months: monthArray});
  });
  yearArray = _.sortBy(yearArray, 'year').reverse();
  //console.log(JSON.stringify(yearArray, null, 2));

  return yearArray;
}

exports.datesList = [
  identifyRoute('app-archive-main'),
  uriContextResolverMiddleware,
  function(req, res, next) {
    var user = req.user;
    var troupe = req.uriContext.troupe;
    var policy = req.uriContext.policy;

    // This is where we want non-logged-in users to return
    if(!user && req.session) {
      req.session.returnTo = '/' + troupe.uri;
    }

    var roomUrl = '/api/v1/rooms/' + troupe.id;
    var roomAvatarUrl = getAvatarUrlForUriContext(req.uriContext);
    var isPrivate = troupe.security !== "PUBLIC";

    var templateContext = {
      layout: 'archive',
      user: user,
      archives: true,
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
      headerView: {
        // TODO: move all the headerView things in here
        avatarUrl: roomAvatarUrl
      },
      isPrivate: isPrivate,
      fonts: fonts.getFonts(),
      hasCachedFonts: fonts.hasCachedFonts(req.cookies),
    };

    return validateRoomForReadOnlyAccess(user, policy)
      .then(function() {
        return policy.canAdmin();
      })
      .then(function(adminAccess) {
        templateContext.isAdmin = adminAccess
        return contextGenerator.generateTroupeContext(req)
      })
      .then(function(troupeContext) {
        templateContext.troupeContext = troupeContext;
        res.render('archive-home-template', templateContext);
      })
      .catch(next);
  },
  redirectErrorMiddleware
];

exports.linksList = [
  identifyRoute('app-archive-links'),
  uriContextResolverMiddleware,
  function(req, res, next) {
    var user = req.user;
    var troupe = req.uriContext.troupe;
    var policy = req.uriContext.policy;

    // This is where we want non-logged-in users to return
    if(!user && req.session) {
      req.session.returnTo = '/' + troupe.uri;
    }

    var roomUrl = '/api/v1/rooms/' + troupe.id;
    var roomAvatarUrl = getAvatarUrlForUriContext(req.uriContext);
    var isPrivate = troupe.security !== "PUBLIC";

    var templateContext = {
      layout: 'archive',
      user: user,
      archives: true,
      bootScriptName: 'router-archive-links',
      cssFileName: 'styles/router-archive-links.css',
      troupeTopic: troupe.topic,
      githubLink: '/' + req.uriContext.uri,
      troupeName: req.uriContext.uri,
      isHomePage: true,
      noindex: troupe.noindex,
      roomUrl: roomUrl,
      accessToken: req.accessToken,
      public: troupe.security === 'PUBLIC',
      headerView: {
        // TODO: move all the headerView things in here
        avatarUrl: roomAvatarUrl
      },
      isPrivate: isPrivate,
      fonts: fonts.getFonts(),
      hasCachedFonts: fonts.hasCachedFonts(req.cookies),
    };

    return validateRoomForReadOnlyAccess(user, policy)
      .then(function() {
        return policy.canAdmin();
      })
      .then(function(adminAccess) {
        templateContext.isAdmin = adminAccess
        // no start, no end, no timezone for now
        return heatmapService.getHeatmapForRoom(troupe.id)
      })
      .then(function(chatActivity) {
        templateContext.chatTree = generateChatTree(chatActivity);
        return contextGenerator.generateTroupeContext(req)
      })
      .then(function(troupeContext) {
        templateContext.troupeContext = troupeContext;

        res.setHeader('Cache-Control', 'public, max-age=' + ONE_DAY_SECONDS);
        res.setHeader('Expires', new Date(Date.now() + ONE_DAY_MILLISECONDS).toUTCString());
        res.render('archive-links-template', templateContext);
      })
      .catch(next);
  },
  redirectErrorMiddleware
];

exports.chatArchive = [
  identifyRoute('app-archive-date'),
  uriContextResolverMiddleware,
  timezoneMiddleware,
  function(req, res, next) {
    var user = req.user;
    var troupe = req.uriContext.troupe;
    var policy = req.uriContext.policy;

    return validateRoomForReadOnlyAccess(user, policy)
      .then(function() {
        var troupeId = troupe.id;

        // This is where we want non-logged-in users to return
        if(!user && req.session) {
          req.session.returnTo = '/' + troupe.uri;
        }

        var yyyy = parseInt(req.params.yyyy, 10);
        var mm = parseInt(req.params.mm, 10);
        var dd = parseInt(req.params.dd, 10);

        var startDateUTC = moment({ year: yyyy, month: mm - 1, day: dd });

        var nextDateUTC = moment(startDateUTC).add(1, 'days');
        var previousDateUTC = moment(startDateUTC).subtract(1, 'days');

        var startDateLocal = dateTZtoUTC(yyyy, mm, dd, res.locals.tzOffset);
        var endDateLocal = moment(startDateLocal).add(1, 'days').toDate();

        var today = moment().endOf('day');
        if(moment(nextDateUTC).endOf('day').isAfter(today)) {
          nextDateUTC = null;
        }

        if(moment(previousDateUTC).startOf('day').isBefore(moment([2013, 11, 1]))) {
          previousDateUTC = null;
        }

        debug('Archive searching for messages in troupe %s in date range %s-%s', troupeId, startDateLocal, endDateLocal);
        return chatService.findChatMessagesForTroupeForDateRange(troupeId, startDateLocal, endDateLocal)
          .then(function(chatMessages) {

            var strategy = new restSerializer.ChatStrategy({
              unread: false, // All chats are read in the archive
              troupeId: troupeId
            });

            return Promise.all([
                contextGenerator.generateTroupeContext(req),
                restSerializer.serialize(chatMessages, strategy)
              ]);
          })
          .spread(function(troupeContext, serialized) {
            troupeContext.archive = {
              archiveDate: startDateUTC,
              nextDate: nextDateUTC,
              previousDate: previousDateUTC
            };

            var language = req.headers['accept-language'];
            if(language) {
              language = language.split(';')[0].split(',');
            } else {
              language = 'en-uk';
            }

            var p = previousDateUTC && moment(previousDateUTC);
            var n = nextDateUTC && moment(nextDateUTC);
            var uri = req.uriContext.uri;

            var startDateLocale = moment(startDateUTC).locale(language);

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
            var monthYearFormatted = startDateLocale.format('MMM YYYY');

            var billingUrl = env.config.get('web:billingBaseUrl') + '/bill/' + req.uriContext.uri.split('/')[0];
            var roomUrl = '/api/v1/rooms/' + troupe.id;

            var roomAvatarUrl = getAvatarUrlForUriContext(req.uriContext);
            var isPrivate = troupe.security !== "PUBLIC";

            /*
            What I'm trying to do here is: The current day is still in-progress, so
            it shouldn't be cached because it can still gain more messages.  All
            past days are done, so they can all safely be cached. But the concept
            of when the day starts and ends depends on res.locals.tzOffset, so
            to make 100% sure I'm just adding an extra 12 hours to the utc day
            (as -12 to +12 are all possible) and then I can avoid doing
            complicated timezone maths using moment and it should work for all
            timezones.
            */
            if (beforeTodayAnyTimezone(endDateLocal)) {
              res.setHeader('Cache-Control', 'public, max-age=' + ONE_YEAR_SECONDS);
              res.setHeader('Expires', new Date(Date.now() + ONE_YEAR_MILLISECONDS).toUTCString());
            }

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
              headerView: {
                // TODO: move all the headerView things in here
                avatarUrl: roomAvatarUrl
              },
              isPrivate: isPrivate,

              /* For prerendered archive-navigation-view */
              previousDate: previousDateFormatted,
              dayName: dayNameFormatted,
              dayOrdinal: dayOrdinalFormatted,
              previousDateLink: previousDateLink,
              nextDate: nextDateFormatted,
              nextDateLink: nextDateLink,
              monthYearFormatted: monthYearFormatted,

              showDatesWithoutTimezone: true, // Timeago widget will render whether or not we know the users timezone
              fonts: fonts.getFonts(),
              hasCachedFonts: fonts.hasCachedFonts(req.cookies),
            });

          });
      })
      .catch(next);
  }
];
