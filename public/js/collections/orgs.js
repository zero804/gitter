"use strict";
var apiClient = require('components/apiClient');
var TroupeCollections = require('./base');

module.exports = (function() {


  var OrgModel = TroupeCollections.Model.extend({
    idAttribute: 'name' // Unusual...
  });

  var OrgCollection = TroupeCollections.LiveCollection.extend({
    model: OrgModel,
    url: apiClient.user.channelGenerator('/orgs')
  });

  return {
    OrgCollection:    OrgCollection,
    OrgModel:         OrgModel
  };

})();

