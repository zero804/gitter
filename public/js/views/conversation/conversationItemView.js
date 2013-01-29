/*jshint unused:true browser:true*/

define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./tmpl/conversationItemView'
], function($, _, Backbone, TroupeViews, template) {
  "use strict";

  var ConversationItemView = TroupeViews.Base.extend({
    template: template,

    initialize: function() {
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
