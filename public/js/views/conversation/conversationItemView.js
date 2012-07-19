// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'dateFormat',
  'hbs!views/conversation/conversationItemView'
], function($, _, Backbone, TroupeViews, dateFormat, template) {
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

      return data;
    },

    showEmail: function(event) {
      window.troupeApp.navigate("mail/" + this.model.get('id'), {trigger: true});
    }

  });


  return ConversationItemView;
});
