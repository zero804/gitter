/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var unreadItemService = require("../../services/unread-item-service");
var troupeService = require('../../services/troupe-service');
var collections = require('../../utils/collections');
var restSerializer = require('../../serializers/rest-serializer');

module.exports = {
  id: 'aggregatedUnreadItem',
  index: function(req, res, next) {
    var userId = req.resourceUser.id;

    return unreadItemService.getAllUnreadItemCounts(userId, 'chat')
      .then(function(counts) {
        var troupeIds = counts.map(function(c) { return c.troupeId; });

        var strategy = new restSerializer.TroupeIdStrategy({ currentUserId: userId, skipUnreadCounts: true });

        return restSerializer.serialize(troupeIds, strategy)
          .then(function(troupes) {
            var troupesIndexed = collections.indexById(troupes);

            var results = [];
            counts.forEach(function(count) {
              var troupe = troupesIndexed[count.troupeId];
              if(troupe) {
                results.push({
                  id: troupe.id,
                  uri: troupe.uri,
                  unreadItems: count.unreadItems,
                  mentions: count.mentions
                });
              }
            });

            res.send(results);
          });
      })
      .fail(next);
  },

  load: function(req, id, callback) {
    return callback(null, id);
  }

};
