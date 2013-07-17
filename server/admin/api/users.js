/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userSearchService = require('../../services/user-search-service');
var restSerializer = require('../../serializers/rest-serializer');

module.exports = {
  index: function(req, res, next) {
    userSearchService.globalUserSearch(req.query.q, { skip: req.query.skip, limit: req.query.limit})
      .then(function(searchResults) {
        var strategy = new restSerializer.SearchResultsStrategy({
                              resultItemStrategy: new restSerializer.UserStrategy()
                            });

        return restSerializer.serializeQ(searchResults, strategy)
          .then(function(serialized) {
            res.send(serialized);
          })
          .fail(next);

      })
      .fail(next);
  }

};