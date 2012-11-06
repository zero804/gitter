define([
  'jquery',
  'underscore',
  'backbone',
  './base',
  'moment'
], function($, _, Backbone, TroupeCollections, moment) {
  "use strict";

  var exports = {};

  exports.EmailModel = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
      var date = this.get('date');
      if(date && typeof date === 'string') {
        date = moment.utc(date);
        this.set('date', date);
      }
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
      var emails = this.get('emails');
      this.emailCollection.reset(emails);
    },

    parse: function(response) {
      response.updated = moment.utc(response.updated);
      return response;
    }

  });

  exports.ConversationModel = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
    },

    parse: function(response) {
      response.updated = moment.utc(response.updated);
      return response;
    }

  });

  exports.ConversationCollection = TroupeCollections.LiveCollection.extend({
    model: exports.ConversationModel,
    modelName: 'conversation',
    nestedUrl: "conversations"
  });

  return exports;

});
