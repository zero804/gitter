'use strict';

const debug = require('debug')('gitter:app:chat-archive');
const asyncHandler = require('express-async-handler');
const StatusError = require('statuserror');
const moment = require('moment');

const env = require('gitter-web-env');
const identifyRoute = env.middlewares.identifyRoute;
const chatService = require('gitter-web-chats');
const restSerializer = require('../../../serializers/rest-serializer');
const contextGenerator = require('../../../web/context-generator');
const burstCalculator = require('../../../utils/burst-calculator');
const generatePermalink = require('gitter-web-shared/chat/generate-permalink');
const urlJoin = require('url-join');
const clientEnv = require('gitter-client-env');
const fonts = require('../../../web/fonts');
const securityDescriptorUtils = require('gitter-web-permissions/lib/security-descriptor-utils');
const getHeaderViewOptions = require('gitter-web-shared/templates/get-header-view-options');
const uriContextResolverMiddleware = require('../../uri-context/uri-context-resolver-middleware');
const redirectErrorMiddleware = require('../../uri-context/redirect-error-middleware');
const preventClickjackingMiddleware = require('../../../web/middlewares/prevent-clickjacking');
const fixMongoIdQueryParam = require('../../../web/fix-mongo-id-query-param');
const { validateRoomForReadOnlyAccess } = require('../archive');

const timezoneMiddleware = require('../../../web/middlewares/timezone');

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365; // 1 year
const ONE_YEAR_MILLISECONDS = ONE_YEAR_SECONDS * 1000;

async function getDateRangeFromReq(req, res, troupe) {
  const yyyy = parseInt(req.params.yyyy, 10);
  const mm = parseInt(req.params.mm, 10);
  const dd = parseInt(req.params.dd, 10);
  const hourRange = req.params.hourRange;

  let fromHour = 0;
  let toHour = 0;
  if (hourRange) {
    const hourMatches = hourRange.match(/(\d\d?)-(\d\d?)/);

    if (!hourMatches) {
      throw new StatusError(404, 'Hour was unable to be parsed');
    }

    fromHour = parseInt(hourMatches[1], 10);
    toHour = parseInt(hourMatches[2], 10);

    if (fromHour < 0 || fromHour > 23) {
      throw new StatusError(404, 'Hour can only be in range 0-23');
    }

    // Currently we force the range to always be 1 hour
    // If the format isn't correct, redirect to the correct hour range
    if (toHour !== fromHour + 1) {
      res.redirect(
        urlJoin(
          clientEnv['basePath'],
          troupe.uri,
          'archives',
          req.params.yyyy,
          req.params.mm,
          req.params.dd,
          `${fromHour}-${fromHour + 1}`
        )
      );
      return false;
    }
  }

  const startDateUTC = moment.utc({ year: yyyy, month: mm - 1, day: dd, hour: fromHour });
  let endDateUTC = moment(startDateUTC).add(1, 'days');
  if (hourRange) {
    endDateUTC = moment.utc({ year: yyyy, month: mm - 1, day: dd, hour: toHour });
  }

  return {
    startDateUTC,
    endDateUTC
  };
}

async function getChatMessagesForReq(req, res, troupe, startDateUTC, endDateUTC) {
  const hourRange = req.params.hourRange;

  debug(
    'Archive searching for messages in troupe %s in date range %s <-> %s',
    troupe.id,
    startDateUTC,
    endDateUTC
  );
  const chatMessages = await chatService.findChatMessagesForTroupeForDateRange(
    troupe.id,
    startDateUTC,
    endDateUTC
  );

  if (hourRange === undefined && chatMessages.length >= chatService.ARCHIVE_MESSAGE_LIMIT) {
    res.redirect(
      urlJoin(
        clientEnv['basePath'],
        troupe.uri,
        'archives',
        req.params.yyyy,
        req.params.mm,
        req.params.dd,
        '0-1'
      )
    );
    return false;
  }

  return chatMessages;
}

async function getArchiveTroupeContext(
  req,
  res,
  troupeId,
  chatMessages,
  startDateUTC,
  endDateUTC,
  aroundId
) {
  // If `currentUserId` isn't specified, all chats are `unread: false` as expected
  const strategy = new restSerializer.ChatStrategy({
    troupeId: troupeId
  });

  const [troupeContext, serializedMessages] = await Promise.all([
    contextGenerator.generateTroupeContext(req),
    restSerializer.serialize(chatMessages, strategy)
  ]);

  const nextDateUTC = moment(startDateUTC).add(1, 'days');
  const previousDateUTC = moment(startDateUTC).subtract(1, 'days');

  troupeContext.archive = {
    startDate: startDateUTC,
    endDate: endDateUTC,
    nextDate: nextDateUTC,
    previousDate: previousDateUTC,
    messages: serializedMessages
  };
  troupeContext.permalinkChatId = aroundId;

  return troupeContext;
}

function getLanguageFromReq(req) {
  let language = req.headers['accept-language'];
  if (language) {
    language = language.split(';')[0].split(',');
  } else {
    language = 'en-uk';
  }

  return language;
}

function generatePrerenderNavigationTemplateData(req, troupeContext, startDateUTC) {
  const language = getLanguageFromReq(req);
  const startDateLocale = moment(startDateUTC).locale(language);

  const ordinalDate = startDateLocale.format('Do');
  const numericDate = startDateLocale.format('D');

  let ordinalPart;
  if (ordinalDate.indexOf('' + numericDate) === 0) {
    ordinalPart = ordinalDate.substring(('' + numericDate).length);
  } else {
    ordinalPart = '';
  }

  const today = moment().endOf('day');
  const dayNameFormatted = numericDate;
  const dayOrdinalFormatted = ordinalPart;
  const monthYearFormatted = startDateLocale.format('MMM YYYY');

  const uri = req.uriContext.uri;

  let previousDateLink;
  if (troupeContext.archive.previousDate.isAfter(moment([2013, 11, 1]))) {
    previousDateLink =
      '/' + uri + '/archives/' + troupeContext.archive.previousDate.format('YYYY/MM/DD');
  }

  let nextDateLink;
  if (troupeContext.archive.nextDate.endOf('day').isSameOrBefore(today)) {
    nextDateLink = '/' + uri + '/archives/' + troupeContext.archive.nextDate.format('YYYY/MM/DD');
  }

  return {
    dayName: dayNameFormatted,
    dayOrdinal: dayOrdinalFormatted,
    monthYearFormatted,
    previousDateLink,
    nextDateLink
  };
}

const chatArchiveRoute = [
  identifyRoute('app-archive-date'),
  uriContextResolverMiddleware,
  preventClickjackingMiddleware,
  timezoneMiddleware,
  asyncHandler(async (req, res /*, next*/) => {
    const user = req.user;
    const troupe = req.uriContext.troupe;
    const policy = req.uriContext.policy;

    await validateRoomForReadOnlyAccess(user, policy);

    // This is where we want non-logged-in users to return
    if (!user && req.session) {
      req.session.returnTo = '/' + troupe.uri;
    }

    const dateRangeResult = await getDateRangeFromReq(req, res, troupe);
    if (dateRangeResult === false) return;
    const { startDateUTC, endDateUTC } = dateRangeResult;

    const aroundId = fixMongoIdQueryParam(req.query.at);
    const chatMessage = await chatService.findById(aroundId);
    if (chatMessage) {
      const sentDateTime = moment(chatMessage.sent);
      const permalink = generatePermalink(troupe.uri, aroundId, sentDateTime, true);
      if (urlJoin(clientEnv['basePath'], req.url) !== permalink) {
        res.redirect(permalink);
        return;
      }
    }

    const chatMessages = await getChatMessagesForReq(req, res, troupe, startDateUTC, endDateUTC);
    if (chatMessages === false) return;

    console.log('chatMessages', chatMessages);

    const troupeContext = await getArchiveTroupeContext(
      req,
      res,
      troupe.id,
      chatMessages,
      startDateUTC,
      endDateUTC,
      aroundId
    );

    const roomUrl = '/api/v1/rooms/' + troupe.id;
    const isPrivate = !securityDescriptorUtils.isPublic(troupe);

    const {
      dayName,
      dayOrdinal,
      monthYearFormatted,
      previousDateLink,
      nextDateLink
    } = generatePrerenderNavigationTemplateData(req, troupeContext, startDateUTC);

    /*
      If the we are showing archive for a finished day, we'll include caching headers
      */
    const today = moment().endOf('day');
    if (today >= endDateUTC) {
      res.setHeader('Cache-Control', 'public, max-age=' + ONE_YEAR_SECONDS);
      res.setHeader('Expires', new Date(Date.now() + ONE_YEAR_MILLISECONDS).toUTCString());
    }

    return res.render('chat-archive-template', {
      layout: 'archive',
      archives: true,
      archiveChats: true,
      bootScriptName: 'router-archive-chat',
      cssFileName: 'styles/router-archive-chat.css',
      githubLink: '/' + req.uriContext.uri,
      user: user,
      troupeContext: troupeContext,
      troupeName: req.uriContext.uri,
      chats: burstCalculator(troupeContext.archive.messages),
      noindex: troupe.noindex,
      roomUrl: roomUrl,
      accessToken: req.accessToken,
      headerView: getHeaderViewOptions(troupeContext.troupe),
      isPrivate: isPrivate,

      /* For prerendered archive-navigation-view */
      dayName,
      dayOrdinal,
      monthYearFormatted,
      previousDateLink,
      nextDateLink,

      fonts: fonts.getFonts(),
      hasCachedFonts: fonts.hasCachedFonts(req.cookies)
    });
  }),
  redirectErrorMiddleware
];

module.exports = chatArchiveRoute;
