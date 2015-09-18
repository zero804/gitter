"use strict";

var restful = require('../../../services/restful');

module.exports = {
  id: 'readBy',

  indexAsync: function(req) {
    return restful.serializeReadBysForChat(req.params.troupeId, req.params.chatMessageId);
  }
};
