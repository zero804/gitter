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

    if(req.query.q) {
      userSearchService.searchForUsers(req.user.id, req.query.q, { limit: req.query.limit, skip: req.query.skip }, function(err, searchResults) {
        var strategy = new restSerializer.SearchResultsStrategy({
                              resultItemStrategy: new restSerializer.UserStrategy()
                            });

        restSerializer.serialize(searchResults, strategy, function(err, serialized) {
          if(err) return next(err);

          res.send(serialized);
        });
      });
      return;
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
