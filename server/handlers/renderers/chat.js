"use strict";

var isolateBurst = require('gitter-web-shared/burst/isolate-burst-array');
var _ = require('lodash');
var roomMembershipService = require('../../services/room-membership-service');
var renderChat = require('./chat-internal');

function renderChatPage(req, res, next) {
  var scriptName = 'router-chat';

  return renderChat(req, res, next, {
    uriContext: req.uriContext,
    template: 'chat-template',
    script: scriptName
  });
}

function renderMobileChat(req, res, next) {
  return renderChat(req, res, next, {
    uriContext: req.uriContext,
    template: 'mobile/mobile-chat',
    script: 'mobile-chat',
    isMobile: true
  });
}

function renderMobileNotLoggedInChat(req, res, next) {
  return renderChat(req, res, next, {
    uriContext: req.uriContext,
    template: 'mobile/mobile-nli-chat',
    script: 'mobile-nli-chat',
    unread: false, // Not logged in users see chats as read
    fetchEvents: false,
    fetchUsers: false,
    isMobile: true
  });
}

function renderNotLoggedInChatPage(req, res, next) {
  return renderChat(req, res, next, {
    uriContext: req.uriContext,
    template: 'chat-nli-template',
    script: 'router-nli-chat',
    unread: false // Not logged in users see chats as read
  });
}

function renderEmbeddedChat(req, res, next) {
  roomMembershipService.countMembersInRoom(req.troupe._id)
    .then(function(userCount) {
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
    })
    .catch(next);
}

function renderNotLoggedInEmbeddedChat(req, res, next) {
  roomMembershipService.countMembersInRoom(req.troupe._id)
    .then(function(userCount) {
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
    })
    .catch(next);
}


function renderChatCard(req, res, next) {
  if (!req.query.at) return next(400);
  var aroundId = req.query.at;

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

module.exports = exports = {
  renderChatPage: renderChatPage,
  renderMobileChat: renderMobileChat,
  renderEmbeddedChat: renderEmbeddedChat,
  renderNotLoggedInEmbeddedChat: renderNotLoggedInEmbeddedChat,
  renderChatCard: renderChatCard,
  renderMobileNotLoggedInChat: renderMobileNotLoggedInChat,
  renderNotLoggedInChatPage: renderNotLoggedInChatPage,
};
