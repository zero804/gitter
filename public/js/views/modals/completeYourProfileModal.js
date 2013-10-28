/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/context',
  'views/signup/usernameView',
  'views/profile/profileView'
], function(context, UsernameView, ProfileView) {
  "use strict";

  return UsernameView.Modal.extend({
    initialize: function(options) {
      options = options || {};
      options.disableClose = true;

      var self = this;
      this.on('chose', function() {
        var modal = new ProfileView.Modal({
          disableClose: true,
          title: "Complete your profile"
        });
        modal.on('submit.success', function() {
          window.location = context.inUserhomeContext() ? '/home' : '/last';
        });
        self.transitionTo(modal);
      });
      this.constructor.__super__.initialize.call(this, options);
    }
  });

});
