/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var _              = require('underscore');
var appEvents      = require('gitter-web-appevents');
var restSerializer = require("../../serializers/rest-serializer");

function serializeChatToRoom(operation, chat) {
  var url = "/rooms/" + chat.toTroupeId + "/chatMessages";

  return restSerializer.serializeModel(chat)
    .then(function(serializedChat) {
      appEvents.dataChange2(url, operation, serializedChat);
      appEvents.chat('create', chat.toTroupeId, serializedChat);
    });
}

module.exports = {
  create: function(chat) {
    return serializeChatToRoom("create", chat);
  },

  update: function(chat) {
    return serializeChatToRoom("update", chat);
  },

  patch: function(chatId, troupeId, patch) {
    var url = "/rooms/" + troupeId + "/chatMessages";
    var patchMessage = _.extend({ }, patch, { id: chatId });
    appEvents.dataChange2(url, "patch", patchMessage);
    appEvents.chat('patch', troupeId, patchMessage);
  },

  remove: function(chat) {
    return this.removeId(chat._id, chat.toTroupeId);
  },

  removeId: function(chatId, troupeId) {
    var url = "/rooms/" + troupeId + "/chatMessages";
    appEvents.dataChange2(url, "remove", { id: chatId });
    appEvents.chat('remove', troupeId, { id: chatId });
  },

};
