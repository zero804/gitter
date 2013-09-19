/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var suggestedContactsService  = require('../../services/suggested-contacts-service');
var restSerializer            = require("../../serializers/rest-serializer");


module.exports = function(req, res, next) {
  var skip = req.query.skip;
  var limit = req.query.limit;
  var excludeTroupeId = req.query.excludeTroupeId;
  var excludeConnected = Boolean(req.query.excludeConnected);
  var statusConnect = Boolean(req.query.statusConnect);
  var statusToTroupe = req.query.statusToTroupe;

  if(statusToTroupe && statusConnect) {
    next(400);
  }

  var queryText = req.query.q;
  if(queryText) queryText = queryText.trim();

  var user = req.user;

  suggestedContactsService.fetchSuggestedContactsForUser(user.id, {
      skip: skip,
      limit: limit,
      query: queryText,
      excludeTroupeId: excludeTroupeId,
      excludeConnected: excludeConnected,
      statusToTroupeId: statusToTroupe,
      statusConnect: statusConnect
    })
    .then(function(suggestions) {

      var strategy = new restSerializer.SearchResultsStrategy({
                            resultItemStrategy: new restSerializer.SuggestedContactStrategy({
                              statusToTroupeId: statusToTroupe,
                              statusToUserId: statusConnect && user.id
                            })
                          });

      return restSerializer.serializeQ(suggestions, strategy)
        .then(function(serialized) {
          res.set('CACHE-CONTROL', 'NO-CACHE');
          res.send(serialized);
        });
    })
    .fail(next);


};