"use strict";
var apiClient = require('components/apiClient');


module.exports = {
    collapse: function (chatId) {
      apiClient.userRoom.post('/collapsedItems', { chatId: chatId }, { global: false });
    },

    uncollapse: function (chatId) {
      apiClient.userRoom.delete('/collapsedItems/' + chatId, { }, { global: false });
    },

    collapseAll: function(chatCollection) {
      chatCollection.each(function(chat) {
        if (chat.get('isCollapsible') && !chat.get('collapsed')) {
          chat.set('collapsed', true);
          apiClient.userRoom.post('/collapsedItems', { chatId: chat.id }, { global: false });
        }
      });
    }
};
