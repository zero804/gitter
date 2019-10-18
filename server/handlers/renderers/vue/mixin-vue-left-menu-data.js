'use strict';
const Promise = require('bluebird');
const vueRenderToString = require('../vue-ssr-renderer');
const restful = require('../../../services/restful');
var contextGenerator = require('../../../web/context-generator');
var generateUserThemeSnapshot = require('../../snapshots/user-theme-snapshot');

async function mixinHbsDataForVueLeftMenu(req, existingData) {
  const user = req.user;
  const userId = user && user.id;
  const [groups, rooms, baseTroupeContext, userThemeSnapshot] = await Promise.all([
    restful.serializeGroupsForUserId(userId),
    restful.serializeTroupesForUser(userId),
    contextGenerator.generateTroupeContext(req),
    generateUserThemeSnapshot(req)
  ]);

  const roomMap = {};
  rooms.forEach(room => {
    roomMap[room.id] = room;
  });

  const uriContext = req.uriContext;
  const room = uriContext && uriContext.troupe;

  const isMobile = req.isPhone;

  const storeData = {
    isMobile,
    isLoggedIn: !!user,
    user,
    darkTheme: userThemeSnapshot.theme === 'gitter-dark',

    roomMap,
    displayedRoomId: room && room.id,

    leftMenuPinnedState: !isMobile,
    leftMenuExpandedState: false
  };

  const vueLeftMenuHtmlOutput = await vueRenderToString({
    moduleToRender: 'left-menu',
    storeData
  });

  const threadMessageFeedHtmlOutput = await vueRenderToString({
    moduleToRender: 'thread-message-feed',
    storeData
  });

  return {
    ...existingData,

    layout: 'chat-layout',
    isMobile,
    leftMenuHtml: vueLeftMenuHtmlOutput,
    threadMessageFeedHtml: threadMessageFeedHtmlOutput,

    troupeContext: {
      ...baseTroupeContext,
      ...(existingData.troupeContext || {}),
      snapshots: {
        ...((existingData.troupeContext || {}).snapshots || {}),
        allRooms: rooms,
        groups: groups
      }
    }
  };
}

module.exports = mixinHbsDataForVueLeftMenu;
