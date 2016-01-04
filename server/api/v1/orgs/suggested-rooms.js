'use strict';

var suggestions    = require('gitter-web-suggestions');
var restSerializer = require('../../../serializers/rest-serializer');

module.exports = {
  index: function(req) {
    var userId  = req.user._id;
    var orgName = req.params.orgName.toLowerCase();
    return suggestions.getSuggestionsForOrg(orgName, userId)
      .then(function(suggestions) {
        return restSerializer.serialize(suggestions, new restSerializer.SuggestedRoomStrategy({ }));
      });
  },
};
