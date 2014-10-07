define([
  'components/apiClient'
], function (apiClient) {
  "use strict";

  return {
    collapse: function (chatId) {
      apiClient.userRoom.post('/collapsedItems', { chatId: chatId }, { global: false });
    },

    uncollapse: function (chatId) {
      apiClient.userRoom.delete('/collapsedItems/' + chatId, { }, { global: false });
    }
  };

});
