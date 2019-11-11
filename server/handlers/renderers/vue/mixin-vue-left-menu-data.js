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

  const uriContext = req.uriContext;
  const currentRoom = uriContext && uriContext.troupe;

  const roomMap = {};

  // the roomMap will contain the current room
  if (currentRoom) {
    roomMap[currentRoom.id] = currentRoom;
  }

  rooms.forEach(room => {
    roomMap[room.id] = room;
  });

  const isMobile = req.isPhone;

  const storeData = {
    isMobile,
    isLoggedIn: !!user,
    user,
    darkTheme: userThemeSnapshot.theme === 'gitter-dark',

    roomMap,
    displayedRoomId: currentRoom && currentRoom.id,

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
