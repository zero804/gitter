'use strict';

var renderChat = require('./chat-internal');
var roomMembershipService = require('../../services/room-membership-service');

function renderSecondaryView(req, res, next, options) {
  var uriContext = options.uriContext;
  var troupe = uriContext.troupe;

  if(!troupe) return next('route');

  roomMembershipService.countMembersInRoom(req.troupe._id)
    .then(function(userCount) {
      if (req.user) {
        return renderChat(req, res, next, {
          uriContext: req.uriContext,
          template: 'chat-embed-template',
          script: 'router-embed-chat',
          classNames: [ 'embedded' ],
          fetchEvents: false,
          fetchUsers: false,
          extras: {
            usersOnline: userCount
          }
        });
      } else {
        return renderChat(req, res, next, {
          uriContext: req.uriContext,
          template: 'chat-nli-embed-template',
          script: 'router-nli-embed-chat',
          unread: false, // Embedded users see chats as read
          classNames: [ 'embedded' ],
          fetchEvents: false,
          fetchUsers: false,
          extras: {
            usersOnline: userCount
          }
        });
      }
    })
    .catch(next);
}

function hasSecondaryView() {
  // Desktop uses a secondary view
  return true;
}

module.exports = {
  renderSecondaryView: renderSecondaryView,
  hasSecondaryView: hasSecondaryView
}
