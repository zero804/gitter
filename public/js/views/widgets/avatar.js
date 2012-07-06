define([
  'jquery',
  'underscore',
  'backbone',
  'hgn!views/widgets/avatar'
], function($, _, Backbone, template) {
  return Backbone.View.extend({
    initialize: function(options) {
      this.user = options.user || {};
    },

    render: function() {
      $(this.el).html(template({
        userDisplayName: this.user.displayName,
        userAvatarUrl: this.user.avatarUrl
      }));
      return this;
    }

  });

});
