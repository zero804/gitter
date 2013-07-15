/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'utils/context',
  'backbone',
  './base',
  '../utils/momentWrapper'
], function($, _, context, Backbone, TroupeCollections, moment) {
  "use strict";
  var exports = {};

  exports.EmailModel = TroupeCollections.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
      var date = this.get('date');
      if(date && typeof date === 'string') {
        date = moment(date, moment.defaultFormat);
        this.set('date', date);
      }
    }

  });

  /* Private Embedded Collections */
  exports.EmailCollection = TroupeCollections.LiveCollection.extend({
    model: exports.EmailModel,
    modelName: 'email',
    initialize: function(options) {
      this.url = "/troupes/" + context.getTroupeId() + "/conversations/" + options.id;
    }

  });

  exports.ConversationDetail = TroupeCollections.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function(options) {
      this.emailCollection = new exports.EmailCollection({ id: options.id });
      this.on('change:emails', this.resetEmails, this);

      this.url = "/troupes/" + window.troupeContext.troupe.id + "/conversations/" + options.id;
    },

    resetEmails: function() {
      var emails = this.get('emails');
      this.emailCollection.reset(emails);
    },

    parse: function(response) {
      response.updated = moment(response.updated, moment.defaultFormat);
      return response;
    }

  });

  exports.ConversationModel = TroupeCollections.Model.extend({
    idAttribute: "id",
    parse: function(response) {
      response.updated = moment.utc(response.updated);
      return response;
    }

  });

  exports.ConversationCollection = TroupeCollections.LiveCollection.extend({
    model: exports.ConversationModel,
    modelName: 'conversation',
    nestedUrl: "conversations",
    preloadKey: 'conversations',
    sortByMethods: {
      'updated': function(conversation) {
        var updated = conversation.get('updated');
        if(!updated) return 0;
        return updated.valueOf();
      }
    },

    initialize: function() {
      this.setSortBy('-updated');
    }
  });
  _.extend(exports.ConversationCollection.prototype, TroupeCollections.ReversableCollectionBehaviour);

  return exports;

});
