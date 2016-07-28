'use strict';

var hbsHelpers = require('./hbs-helpers');
var avatarImgSrcSetHbsHelper = require('gitter-web-avatars/shared/avatar-img-srcset-hbs-helper');

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
  hbs.registerHelper('newrelic', require('./newrelic-helper'));
  hbs.registerHelper('paginate', require('./paginate-helper'));
  hbs.registerHelper('topic-component', require('./topic-component-helper'));
  hbs.registerHelper('topic-context', require('./topic-context-helper'));

  hbs.registerHelper('avatarSrcSet', avatarImgSrcSetHbsHelper);
};
