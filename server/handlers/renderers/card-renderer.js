'use strict';

var renderChat = require('./chat-internal');
var StatusError = require('statuserror');
var securityDescriptorUtils = require('gitter-web-permissions/lib/security-descriptor-utils');
var fixMongoIdQueryParam = require('../../web/fix-mongo-id-query-param');
var isolateBurst = require('gitter-web-shared/burst/isolate-burst-array');
var _ = require('lodash');

function renderSecondaryView(req, res, next, options) {
  var uriContext = options.uriContext;
  var troupe = uriContext.troupe;

  if(!troupe) return next('route');

  if (!securityDescriptorUtils.isPublic(troupe)) {
    return next(new StatusError(403));
  }

  var aroundId = fixMongoIdQueryParam(req.query.at);
  if(!aroundId) return next(new StatusError(400));

  return renderChat(req, res, next, {
    uriContext: req.uriContext,
    limit: 20,
    template: 'chat-card-template',
    stylesheet: 'chat-card',
    fetchEvents: false,
    fetchUsers: false,
    generateContext: false,
    unread: false, // Embedded users see chats as read
    classNames: [ 'card' ],
    filterChats: function(chats) {
      // Only show the burst
      // TODO: move this somewhere useful
      var permalinkedChat = _.find(chats, function(chat) { return chat.id === aroundId; });
      if (!permalinkedChat) return [];

      var burstChats = isolateBurst(chats, permalinkedChat);
      return burstChats;
    }
  });
}

function hasSecondaryView() {
  // Desktop uses a secondary view
  return true;
}

module.exports = {
  renderSecondaryView: renderSecondaryView,
  hasSecondaryView: hasSecondaryView
}
