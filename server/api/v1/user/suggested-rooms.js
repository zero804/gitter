/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restSerializer = require("../../../serializers/rest-serializer");
// var suggestions    = require('gitter-web-suggestions');
var legacyRecommendations = require('../../../services/recommendations/legacy-recommendations');

module.exports = {
  id: 'resourceUserSuggestedRoom',

  index: function(req, res, next) {
    if(!req.user) {
      return res.sendStatus(403);
    }

    return legacyRecommendations.getSuggestionsForUser(req.user, req.i18n.getLocale())
      .then(function(suggestions) {
        return restSerializer.serializeQ(suggestions, new restSerializer.SuggestedRoomStrategy({ }));
      })
      .then(function(serialized) {
        return res.send(serialized);
      })
      .catch(next);
  }

};
