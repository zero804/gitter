/* eslint complexity: ["error", 20] */
'use strict';

var env = require('gitter-web-env');
var identifyRoute = env.middlewares.identifyRoute;

var Promise = require('bluebird');
var moment = require('moment');
var _ = require('lodash');
var StatusError = require('statuserror');

var contextGenerator = require('../../web/context-generator');
var securityDescriptorUtils = require('gitter-web-permissions/lib/security-descriptor-utils');
var fonts = require('../../web/fonts');
var getHeaderViewOptions = require('gitter-web-shared/templates/get-header-view-options');
var chatHeapmapAggregator = require('gitter-web-elasticsearch/lib/chat-heatmap-aggregator');
var uriContextResolverMiddleware = require('../uri-context/uri-context-resolver-middleware');
var redirectErrorMiddleware = require('../uri-context/redirect-error-middleware');
var preventClickjackingMiddleware = require('../../web/middlewares/prevent-clickjacking');

var ONE_DAY_SECONDS = 60 * 60 * 24; // 1 day
var ONE_DAY_MILLISECONDS = ONE_DAY_SECONDS * 1000;

var validateRoomForReadOnlyAccess = Promise.method(function(user, policy) {
  return policy.canRead().then(function(access) {
    if (access) return;
    if (!user) throw new StatusError(401); // Very suspect...
    throw new StatusError(404);
  });
});

exports.validateRoomForReadOnlyAccess = validateRoomForReadOnlyAccess;

function generateChatTree(chatActivity) {
  // group things in nested maps
  var yearMap = {};
  _.each(chatActivity, function(count, unixTime) {
    var date = moment(unixTime, 'X');
    var year = date.year();
    var month = date.format('MM'); // 01-12
    var day = date.format('DD'); // 01-31
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
  // O(𝑛³) code uphead. Good times.
  var yearArray = [];
  _.each(yearMap, function(monthMap, year) {
    var monthArray = [];
    _.each(monthMap, function(dayMap, month) {
      var dayArray = [];
      _.each(dayMap, function(count, day) {
        dayArray.push({ day: day, count: count });
      });
      dayArray = _.sortBy(dayArray, 'day'); // not reversed
      var monthName = moment.months()[parseInt(month, 10) - 1];
      monthArray.push({ month: month, monthName: monthName, days: dayArray }); // monthName?
    });
    monthArray = _.sortBy(monthArray, 'month').reverse();
    yearArray.push({ year: year, months: monthArray });
  });
  yearArray = _.sortBy(yearArray, 'year').reverse();
  //console.log(JSON.stringify(yearArray, null, 2));

  return yearArray;
}

exports.datesList = [
  identifyRoute('app-archive-main'),
  preventClickjackingMiddleware,
  uriContextResolverMiddleware,
  function(req, res, next) {
    var user = req.user;
    var troupe = req.uriContext.troupe;
    var policy = req.uriContext.policy;

    // This is where we want non-logged-in users to return
    if (!user && req.session) {
      req.session.returnTo = '/' + troupe.uri;
    }

    var roomUrl = '/api/v1/rooms/' + troupe.id;

    return validateRoomForReadOnlyAccess(user, policy)
      .then(function() {
        return [policy.canAdmin(), contextGenerator.generateTroupeContext(req)];
      })
      .spread(function(adminAccess, troupeContext) {
        var templateContext = {
          layout: 'archive',
          user: user,
          archives: true,
          bootScriptName: 'router-archive-home',
          cssFileName: 'styles/router-archive-home.css',
          troupeName: req.uriContext.uri,
          isHomePage: true,
          noindex: troupe.noindex,
          roomUrl: roomUrl,
          accessToken: req.accessToken,
          public: securityDescriptorUtils.isPublic(troupe),
          headerView: getHeaderViewOptions(troupeContext.troupe),
          fonts: fonts.getFonts(),
          hasCachedFonts: fonts.hasCachedFonts(req.cookies),
          isAdmin: adminAccess, // Used by archive.hbs
          troupeContext: troupeContext
        };

        res.render('archive-home-template', templateContext);
      })
      .catch(next);
  },
  redirectErrorMiddleware
];

exports.linksList = [
  identifyRoute('app-archive-links'),
  preventClickjackingMiddleware,
  uriContextResolverMiddleware,
  function(req, res, next) {
    var user = req.user;
    var troupe = req.uriContext.troupe;
    var policy = req.uriContext.policy;

    // This is where we want non-logged-in users to return
    if (!user && req.session) {
      req.session.returnTo = '/' + troupe.uri;
    }

    var roomUrl = '/api/v1/rooms/' + troupe.id;
    var isPrivate = !securityDescriptorUtils.isPublic(troupe);

    return validateRoomForReadOnlyAccess(user, policy)
      .then(function() {
        return [
          policy.canAdmin(),
          chatHeapmapAggregator.getHeatmapForRoom(troupe.id),
          contextGenerator.generateTroupeContext(req)
        ];
      })
      .spread(function(adminAccess, chatActivity, troupeContext) {
        // no start, no end, no timezone for now
        var templateContext = {
          layout: 'archive',
          user: user,
          archives: true,
          bootScriptName: 'router-archive-links',
          cssFileName: 'styles/router-archive-links.css',
          troupeName: req.uriContext.uri,
          isHomePage: true,
          noindex: troupe.noindex,
          roomUrl: roomUrl,
          accessToken: req.accessToken,
          public: securityDescriptorUtils.isPublic(troupe),
          headerView: getHeaderViewOptions(troupeContext.troupe),
          isPrivate: isPrivate,
          fonts: fonts.getFonts(),
          hasCachedFonts: fonts.hasCachedFonts(req.cookies),
          troupeContext: troupeContext,
          isAdmin: adminAccess,
          chatTree: generateChatTree(chatActivity)
        };

        res.setHeader('Cache-Control', 'public, max-age=' + ONE_DAY_SECONDS);
        res.setHeader('Expires', new Date(Date.now() + ONE_DAY_MILLISECONDS).toUTCString());
        res.render('archive-links-template', templateContext);
      })
      .catch(next);
  },
  redirectErrorMiddleware
];
