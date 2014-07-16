/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restSerializer = require("../../serializers/rest-serializer");
var userService = require("../../services/user-service");
var search = require("../../services/github-gitter-user-search")

module.exports = {
  id: 'resourceUser',
  index: function(req, res, next) {
    if(!req.user) {
      return next(403);
    }

    if(req.query.q) {

      var searchQuery = req.query.q;
      var user = req.user;
      var limit = req.query.limit || 10;
      var skip = req.query.skip;
      var excludeTroupeId = req.query.excludeTroupeId;

      return search(searchQuery, user, excludeTroupeId, limit, skip)
        .then(function(searchResults) {
          var strategy = new restSerializer.SearchResultsStrategy({
            resultItemStrategy: new restSerializer.UserStrategy()
          });

          return restSerializer.serializeQ(searchResults, strategy);
        })
        .then(function(searchResults) {
          res.send(searchResults);
        })
        .fail(next);
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
    if(id === 'me') {
      id = req.user.id;
    } else {
      // TODO: can the currently logged in user view information about this other user?
      // For the moment, you'll only be able to see your own information
      if(req.user.id != id) return callback(403);
    }

    userService.findById(id, callback);
  }

};
