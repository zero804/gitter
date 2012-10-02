define([
  'jquery',
  'underscore',
  'backbone',
  './base'
], function($, _, Backbone, TroupeCollections) {
  "use strict";

  var exports = {};


  exports.EmailModel = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
    }

  });

  /* Private Embedded Collections */
  exports.EmailCollection = Backbone.Collection.extend({
    model: exports.EmailModel,
    initialize: function() {
    }

  });

  exports.ConversationDetail = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function(options) {
      this.emailCollection = new exports.EmailCollection();
      this.on('change:emails', this.resetEmails, this);

      this.url = "/troupes/" + window.troupeContext.troupe.id + "/conversations/" + options.id;
    },

    resetEmails: function() {
      this.emailCollection.reset(this.get('emails'));
    }

  });

  exports.ConversationModel = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
    }

  });

  exports.ConversationCollection = TroupeCollections.LiveCollection.extend({
    model: exports.ConversationModel,
    modelName: 'conversation',
    nestedUrl: "conversations"
  });

  return exports;

});
