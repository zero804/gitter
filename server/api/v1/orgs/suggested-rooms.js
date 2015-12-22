'use strict';

var suggestions         = require('gitter-web-suggestions');

module.exports = {
  index: function(req) {
    var userId  = req.user._id;
    var orgName = req.params.orgName.toLowerCase();
    return suggestions.getSuggestionsForOrg(orgName, userId);
  },
};
