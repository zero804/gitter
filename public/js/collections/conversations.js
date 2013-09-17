/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/context',
  './base',
  '../utils/momentWrapper',
  'cocktail'
], function(context, TroupeCollections, moment, cocktail) {
  "use strict";

  var EmailModel = TroupeCollections.Model.extend({
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
  var EmailCollection = TroupeCollections.LiveCollection.extend({
    model: EmailModel,
    modelName: 'email',
    initialSortBy: 'date',
    sortByMethods: {
        'date': function(email) {
          return email.get('date');
        }
    },

    initialize: function(options) {
      this.url = "/troupes/" + context.getTroupeId() + "/conversations/" + options.id;
    }

  });

  cocktail.mixin(EmailCollection, TroupeCollections.ReversableCollectionBehaviour);

  var ConversationDetail = TroupeCollections.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function(options) {
      this.emailCollection = new EmailCollection({ id: options.id });
      this.on('change:emails', this.resetEmails, this);

      this.url = "/troupes/" + context.getTroupeId() + "/conversations/" + options.id;
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

  var ConversationModel = TroupeCollections.Model.extend({
    idAttribute: "id",
    parse: function(response) {
      response.updated = moment.utc(response.updated);
      return response;
    }

  });

  var ConversationCollection = TroupeCollections.LiveCollection.extend({
    model: ConversationModel,
    modelName: 'conversation',
    nestedUrl: "conversations",
    initialSortBy: '-updated',
    sortByMethods: {
      'updated': function(conversation) {
        var updated = conversation.get('updated');
        if(!updated) return 0;
        return updated.valueOf();
      }
    }
  });
  cocktail.mixin(ConversationCollection, TroupeCollections.ReversableCollectionBehaviour);

  return {
    EmailModel: EmailModel,
    EmailCollection: EmailCollection,
    ConversationCollection: ConversationCollection,
    ConversationModel: ConversationModel,
    ConversationDetail: ConversationDetail,
  };

});
