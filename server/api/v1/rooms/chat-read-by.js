"use strict";

var restful = require('../../../services/restful');

module.exports = {
  id: 'readBy',

  index: function(req, res, next) {
    return restful.serializeReadBysForChat(req.params.troupeId, req.params.chatMessageId)
      .then(function(serialized) {
        res.send(serialized);
      })
      .catch(next);
  }
};
