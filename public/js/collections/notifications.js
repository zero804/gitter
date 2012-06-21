define([
  'jquery',
  'underscore',
  'backbone',
  'models/notification'
], function($, _, Backbone, NotificationModel) {
  var NotificationCollection = Backbone.Collection.extend({
    model: NotificationModel,
    url: "/troupes/" + window.troupeContext.troupe.id + "/notifications",
    initialize: function() {
    }

  });

  return NotificationCollection;
});
