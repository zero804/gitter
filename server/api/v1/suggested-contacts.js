/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var suggestedContactsService  = require('../../services/suggested-contacts-service');
var restSerializer            = require("../../serializers/rest-serializer");

module.exports = function(req, res, next) {
  var skip = req.query.skip;
  var limit = req.query.limit;
  var excludeTroupeId = req.query.excludeTroupeId;
  var excludeConnected = Boolean(req.query.excludeConnected);

  var queryText = req.query.q;
  if(queryText) queryText = queryText.trim();

  var user = req.user;

  suggestedContactsService.fetchSuggestedContactsForUser(user.id, {
      skip: skip,
      limit: limit,
      query: queryText,
      excludeTroupeId: excludeTroupeId,
      excludeConnected: excludeConnected
    })
    .then(function(suggestions) {

      var strategy = new restSerializer.SearchResultsStrategy({
                            resultItemStrategy: new restSerializer.SuggestedContactStrategy()
                          });

      return restSerializer.serializeQ(suggestions, strategy)
        .then(function(serialized) {
          res.send(serialized);
        });
    })
    .fail(next);


};