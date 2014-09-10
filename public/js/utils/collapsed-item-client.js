define([
  'jquery',
  'utils/context'
], function ($, context) {
  "use strict";

  var URL = '/api/v1/user/' + context.getUserId() + '/rooms/' + context.getTroupeId() + '/collapsedItems';

  return {

    collapse: function (chatId) {
      $.ajax({
        url: URL,
        data: JSON.stringify({
          chatId: chatId
        }),
        contentType: "application/json",
        type: "POST",
        global: false
      });
    },

    uncollapse: function (chatId) {
      $.ajax({
        url: URL + '/' + chatId,
        type: "DELETE",
        global: false
      });
    }
  };

});