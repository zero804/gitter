/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'views/profile/profileView',
  'views/signup/usernameView'
  ], function(ProfileView, UsernameView) {
  "use strict";

  var getDisplayNamePasswordModal = function(username) {
    var modal = new ProfileView.Modal({ disableClose: true });
    modal.on('submit.success', function() {
      window.location = '/' + username;
    });
    return modal;
  };

  if(window.troupeContext.user.username) {

    var namePasswordModal = getDisplayNamePasswordModal(window.troupeContext.user.username);
    namePasswordModal.show();

  } else {

    var usernameModal = new UsernameView.Modal({ disableClose: true });
    usernameModal.on('chose', function(username) {
      var namePasswordModal = getDisplayNamePasswordModal(username);
      usernameModal.transitionTo(namePasswordModal);
    });
    usernameModal.show();
  }

});
