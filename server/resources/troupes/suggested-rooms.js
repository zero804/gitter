/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restSerializer        = require("../../serializers/rest-serializer");
// var splitTests            = require('gitter-web-split-tests');
var graphRecommendations  = require('gitter-web-recommendations');
// var legacyRecommendations = require('../../services/recommendations/legacy-recommendations');

module.exports = {
  id: 'resourceTroupeSuggestedRoom',

  index: function(req, res, next) {
    // var variant = splitTests.configure(req, res, 'suggest');

    // var backend = variant === 'control' ? legacyRecommendations: graphRecommendations;
    return graphRecommendations.getSuggestionsForRoom(req.troupe, req.user)
      .then(function(suggestions) {
        return restSerializer.serializeQ(suggestions, new restSerializer.SuggestedRoomStrategy({ }));
      })
      .then(function(serialized) {
        return res.send(serialized);
      })
      .fail(next);
  }

};
