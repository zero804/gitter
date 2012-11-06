define([
  'jquery',
  'underscore',
  'backbone',
  './base',
  '../utils/momentWrapper'
], function($, _, Backbone, TroupeCollections, moment) {
  "use strict";

  var exports = {};

  exports.FileVersionModel = Backbone.Model.extend({
    parse: function(response) {
      response.createdDate = moment.utc(response.createdDate);
      return response;
    }

  });

  exports.FileVersionCollection  = Backbone.Collection.extend({
    model: exports.FileVersionModel
  });

  exports.FileModel = TroupeCollections.Model.extend({
      idAttribute: "id",

      defaults: {
      },

      initialize: function() {
        this.convertArrayToCollection('versions', exports.FileVersionCollection);
      }

    });

  exports.FileCollection = TroupeCollections.LiveCollection.extend({
    model: exports.FileModel,
    modelName: 'file',
    nestedUrl: "files"
  });

  return exports;
});
