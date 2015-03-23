'use strict';

var hbsHelpers = require('./hbs-helpers');

module.exports = function(hbs) {
  Object.keys(hbsHelpers).forEach(function(key) {
    var helper = hbsHelpers[key];
    if (typeof helper !== 'function') return;
    hbs.registerHelper(key, helper);
  });

  hbs.registerHelper('prerenderView', require('./prerender-helper'));
  hbs.registerHelper('chatItemPrerender', require('./prerender-chat-helper'));
  hbs.registerHelper('activityItemPrerender', require('./prerender-activity-helper'));
  hbs.registerHelper('widget', require('./widget-prerenderers').widget);
  hbs.registerHelper('prerenderRoomListItem', require('./prerender-room-item-helper'));
  hbs.registerHelper('prerenderOrgListItem', require('./prerender-org-item-helper'));
};