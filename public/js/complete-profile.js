/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'utils/context',
  'views/profile/profileView',
  'views/signup/usernameView'
  ], function(context, ProfileView, UsernameView) {
  "use strict";

  var getDisplayNamePasswordModal = function(username) {
    var modal = new ProfileView.Modal({
      disableClose: true,
      title: "Complete your profile"
    });
    modal.on('submit.success', function() {
      window.localStorage.startTour = 1;
      window.location = '/' + username;
    });
    return modal;
  };

  var existingUsername = context.getUser().username;

  if(existingUsername) {

    var namePasswordModal = getDisplayNamePasswordModal(existingUsername);
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
