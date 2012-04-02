define([
  'jquery',
  'underscore',
  'backbone',
  'models/invite'
], function($, _, Backbone, InviteModel) {
  var InviteCollection = Backbone.Collection.extend({
    model: InviteModel,
    url: "/troupes/" + window.troupeContext.troupe.id + "/invites",
    initialize: function() {
    }

  });

  return InviteCollection;
});
