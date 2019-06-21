'use strict';
const Promise = require('bluebird');
const vueRenderToString = require('../vue-ssr-renderer');
const restful = require('../../../services/restful');
var contextGenerator = require('../../../web/context-generator');

async function mixinHbsDataForVueLeftMenu(req, existingData) {
  const useVueLeftMenu = req.fflip.has('vue-left-menu');
  if (!useVueLeftMenu) {
    return existingData;
  }

  const user = req.user;
  const userId = user && user.id;
  const [groups, rooms, baseTroupeContext] = await Promise.all([
    restful.serializeGroupsForUserId(userId),
    restful.serializeTroupesForUser(userId),
    contextGenerator.generateTroupeContext(req)
  ]);

  const roomMap = {};
  rooms.forEach(room => {
    roomMap[room.id] = room;
  });

  const uriContext = req.uriContext;
  const room = uriContext && uriContext.troupe;

  const isMobile = req.isPhone;

  const vueLeftMenuHtmlOutput = await vueRenderToString({
    moduleToRender: 'left-menu',
    storeData: {
      isMobile,
      roomMap,
      displayedRoomId: room && room.id,

      leftMenuPinnedState: !isMobile,
      leftMenuExpandedState: false
    }
  });

  return {
    ...existingData,

    layout: 'chat-layout',
    isMobile,
    useVueLeftMenu: useVueLeftMenu,
    leftMenuHtml: vueLeftMenuHtmlOutput,

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
