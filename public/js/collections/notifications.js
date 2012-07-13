define([
  'jquery',
  'underscore',
  'backbone',
  'models/notification'
], function($, _, Backbone, NotificationModel) {
  var baseUrl;
  if(window.troupeContext.troupe) {
    baseUrl = "/troupes/" + window.troupeContext.troupe.id + "/notifications";
  }

  var NotificationCollection = Backbone.Collection.extend({
    model: NotificationModel,
    url: baseUrl,
    initialize: function() {
    }

  });

  return NotificationCollection;
});
