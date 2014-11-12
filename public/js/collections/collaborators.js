"use strict";
var apiClient = require('components/apiClient');
var TroupeCollections = require('./base');
var Backbone = require('backbone');

module.exports = (function() {


  var CollabModel = TroupeCollections.Model.extend({
    idAttribute: 'id'
  });

  var CollabCollection = Backbone.Collection.extend({
    model: CollabModel,
    url: apiClient.room.channelGenerator("/collaborators")
  });

  return {
    CollabCollection: CollabCollection,
    CollabModel: CollabModel
  };

})();

