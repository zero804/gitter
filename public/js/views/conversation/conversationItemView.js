// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!views/conversation/conversationItemView'
], function($, _, Backbone, TroupeViews, template) {
  "use strict";

  var ConversationItemView = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
    },

    events: {
      "click .clickPoint-showEmail": "showEmail"
    },

    getRenderData: function() {
      var data = this.model.toJSON();
      data.detailUrl = "#mail/" + data.id;

      data.updated = Date.parse(data.updated);
      var d = new Date(data.updated);
      data.updated = d.toUTCString();
      var now = new Date();
      if (now.getDate() === d.getDate() && now.getMonth() === d.getMonth() && now.getFullYear() === d.getFullYear()) {
        data.updated = d.format('h:MM TT');
      }
      else {
        data.updated = d.format('mmm d');
      }

      return data;
    },

    showEmail: function(event) {
      window.troupeApp.navigate("mail/" + this.model.get('id'), {trigger: true});
    }

  });


  return ConversationItemView;
});
