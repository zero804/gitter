/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restSerializer = require("../../serializers/rest-serializer");
var userService = require("../../services/user-service");
var userSearchService = require("../../services/user-search-service");

module.exports = {
  id: 'resourceUser',

  index: function(req, res, next) {
    if(!req.user) {
      return next(403);
    }

    var unconnected = Boolean(req.query.unconnected);

    if(req.query.q) {
      var options = {
        limit: req.query.limit,
        skip: req.query.skip,
        excludeTroupeId: req.query.excludeTroupeId
      };


      var search = unconnected ? userSearchService.searchUnconnectedUsers(req.user.id, req.query.q, options)
                               : userSearchService.searchForUsers(req.user.id, req.query.q, options);

      return search.then(function(searchResults) {
        var strategy = new restSerializer.SearchResultsStrategy({
                              resultItemStrategy: new restSerializer.UserStrategy()
                            });

        return restSerializer.serializeQ(searchResults, strategy)
          .then(function(serialized) {
            res.send(serialized);
          })
          .fail(next);

      });

    }

    var strategy = new restSerializer.UserStrategy();
    restSerializer.serialize(req.user, strategy, function(err, serialized) {
      if(err) return next(err);

      res.send([serialized]);
    });
  },

  show: function(req, res, next) {
    var strategy = new restSerializer.UserStrategy();

    restSerializer.serialize(req.resourceUser, strategy, function(err, serialized) {
      if(err) return next(err);

      res.send(serialized);
    });
  },

  load: function(req, id, callback) {
    if(!req.user) return callback(401);
    // TODO: can the currently logged in user view information about this other user?
    // For the moment, you'll only be able to see your own information
    if(req.user.id != id) return callback(403);
    userService.findById(id, callback);
  }

};
