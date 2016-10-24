'use strict';

var renderChat = require('./chat-internal');
var mainFrameRenderer = require('../renderers/main-frame');
var orgRenderer = require('./org');
var fixMongoIdQueryParam = require('../../web/fix-mongo-id-query-param');
var url = require('url');
var social = require('../social-metadata');
var chatService = require('../../services/chat-service');
var restSerializer = require("../../serializers/rest-serializer");
var securityDescriptorUtils = require('gitter-web-permissions/lib/security-descriptor-utils');

function getSocialMetaDataForRoom(room, serializedRoom, aroundId) {
  // TODO: change this to use policy
  if (aroundId && room && securityDescriptorUtils.isPublic(room)) {
    // If this is a permalinked chat, load special social meta-data....
    return chatService.findByIdInRoom(room._id, aroundId)
      .then(function(chat) {
        var chatStrategy = new restSerializer.ChatStrategy({
          notLoggedIn: true,
          troupeId: room._id
        });


        return restSerializer.serializeObject(chat, chatStrategy);
      })
      .then(function(permalinkChatSerialized) {
        return social.getMetadataForChatPermalink({
          room: serializedRoom,
          chat: permalinkChatSerialized
        });
      });
  }

  return social.getMetadata({ room: serializedRoom });
}

function renderPrimaryView(req, res, next, options) {
  var uriContext = options.uriContext;
  var troupe = uriContext.troupe;
  var group = uriContext.group;

  if (uriContext.ownUrl) {
    return res.redirect('/home/explore');
  }

  // Chat room?
  if (troupe) {
    // Load the main-frame
    var chatAppQuery = {};
    var aroundId = fixMongoIdQueryParam(req.query.at);

    if (aroundId) { chatAppQuery.at = aroundId; }

    var subFrameLocation = url.format({
      pathname: '/' + uriContext.uri + '/~chat',
      query:    chatAppQuery,
      hash:     '#initial'
    });

    mainFrameRenderer.renderMainFrame(req, res, next, {
      subFrameLocation: subFrameLocation,
      title: uriContext.uri,
      socialMetadataGenerator: function(troupeContext) {
        var serializedRoom = troupeContext.troupe;
        return getSocialMetaDataForRoom(troupe, serializedRoom, aroundId);
      }
    });

    return;
  }

  if (group) {
    // Rendering a group home?

    var groupSubFrameLocation = url.format({
      pathname: '/orgs/' + group.uri + '/rooms/~iframe',
      hash:     '#initial'
    });

    mainFrameRenderer.renderMainFrame(req, res, next, {
      subFrameLocation: groupSubFrameLocation,
      title: uriContext.uri,
      socialMetadataGenerator: function(/*troupeContext*/) {
        // TODO: generate social meta-data for a group...
        return null;
      }
    });

    return;
  }

  return next('route');
}

function renderSecondaryView(req, res, next, options) {
  var uriContext = options.uriContext;
  var troupe = uriContext.troupe;
  var group = uriContext.group;

  if (group) {
    return orgRenderer.renderOrgPage(req, res, next);
  }

  if (troupe) {
    if(req.user) {
      return renderChat(req, res, next, {
        uriContext: uriContext,
        template: 'chat-template',
        script: 'router-chat'
      });
    } else {
      // We're doing this so we correctly redirect a logged out
      // user to the right chat post login
      var url = req.originalUrl;
      req.session.returnTo = url.replace(/\/~\w+(\?.*)?$/,"");

      return renderChat(req, res, next, {
        uriContext: uriContext,
        template: 'chat-nli-template',
        script: 'router-nli-chat',
        unread: false // Not logged in users see chats as read
      });
    }
  }

}

function hasSecondaryView() {
  // Desktop uses a secondary view
  return true;
}

module.exports = {
  renderPrimaryView: renderPrimaryView,
  renderSecondaryView: renderSecondaryView,
  hasSecondaryView: hasSecondaryView
}
