// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'utils/vent',
  'hbs!views/conversation/conversationItemView'
], function($, _, Backbone, TroupeViews, vent, template) {
  "use strict";

  var ConversationItemView = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
    },

    getRenderData: function() {
      var data = this.model.toJSON();
      data.detailUrl = "#mail/" + data.id;

      data.updated = data.updated ? data.updated.calendar() : null;

      return data;
    }

  });


  return ConversationItemView;
});
