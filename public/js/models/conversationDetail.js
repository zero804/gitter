define([
  'underscore',
  'backbone'
], function(_, Backbone) {

  var EmailModel = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
    }

  });

  /* Private Embedded Collections */
  var EmailCollection = Backbone.Collection.extend({
    model: EmailModel,
    initialize: function() {
    }

  });

  return Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
      console.log("INIT ConversationDetail");
      this.emailCollection = new EmailCollection();
      this.on('change:emails', this.resetEmails, this);
      //this.messages.on("reset", this.updateCounts);
    },

    resetEmails: function() {
      console.dir('RESET EMAILS!!!');
      this.emailCollection.reset(this.get('emails'));
    }

  });

});
