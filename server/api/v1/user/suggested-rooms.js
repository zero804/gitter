"use strict";

var restSerializer        = require("../../../serializers/rest-serializer");
var legacyRecommendations = require('../../../services/recommendations/legacy-recommendations');
var StatusError           = require('statuserror');

module.exports = {
  id: 'resourceUserSuggestedRoom',

  index: function(req) {
    if(!req.user) throw new StatusError(401);

    return legacyRecommendations.getSuggestionsForUser(req.user, req.i18n.getLocale())
      .then(function(suggestions) {
        return restSerializer.serialize(suggestions, new restSerializer.SuggestedRoomStrategy({ }));
      });
  }

};
