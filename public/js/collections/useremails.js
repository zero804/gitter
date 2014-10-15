define([
  'jquery',
  'underscore',
  'backbone',
  'utils/context',
  './base'
], function($, _, Backbone, context, TroupeCollections) {
  "use strict";

  var exports = {};

  exports.UserEmailModel = TroupeCollections.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
    },

    makePrimary: function(options) {
      var primary = this.collection.findWhere({ status: "PRIMARY" });
      this.save({ status: "PRIMARY" }, {
        success: function() {
          primary.set('status', 'CONFIRMED');
          if (options.success) options.success();
        }
      });
    }

  });

  exports.UserEmailCollection = TroupeCollections.LiveCollection.extend({
    model: exports.UserEmailModel,
    modelName: 'useremail',
    url: function() {
      return "/v1/user/" + context.getUserId() + "/emails";
    }
  });

  return exports;

});
