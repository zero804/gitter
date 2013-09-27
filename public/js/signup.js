/*jshint strict:true, undef:true, unused:strict, browser:true *//*global require:false */
require([
  'jquery',
  'views/base',
  'views/signup/usernameView',
  'views/signup/signupModalView',
  'views/signup/signupModalConfirmView',
  'views/login/loginModalView',
  'views/app/messagesView',
  'utils/validate-wrapper', // No ref!
  'retina'
 ],
  function($, TroupeViews, UsernameView, SignupModalView, SignupModalConfirmView, LoginModalView, MessagesView) {
    "use strict";

    //var loginFormVisible = false;

    function createLoginModal(options) {
      if (!options) options = {};
      options.fromSignup = true;
      var view = new LoginModalView(options);
      var modal = new TroupeViews.Modal({ view: view });
      view.on('login.complete', function(data) {
        modal.off('login.complete');

        window.location.href= data.redirectTo;
      });

      view.once('login.close', function(/*data*/) {
        modal.hide();
      });
      return modal;
    }

    function passwordResetFailed() {
      var modal = new TroupeViews.ConfirmationModal({
        confirmationTitle: "Reset Failed",
        body: "That password reset link is invalid.",
        menuItems: [
          {
            action: "retry-reset",
            text: "Back to login"
          }
        ]
      });

      modal.on('menuItemClicked', function() {
        modal.transitionTo(createLoginModal());
      });

      modal.on('hide', function() {
        window.location.href = window.location.href.replace("passwordResetFailed","");
      });

      modal.show();
    }

    function showMessage() {
      var v = new MessagesView({ messageName : window.location.hash });
      v.show();
    }

    function chooseUsername() {
      var modal = new UsernameView.Modal({ disableClose: true });

      modal.show();

      modal.on('chose', function(username) {
        window.location = '/' + username;
      });
    }

    function signup() {

      if (window.profileHasNoUsername) {
        return chooseUsername();
      }

      var view = new SignupModalView();
      var modal = new TroupeViews.Modal({ view: view });

      view.once('signup.complete', function(data) {
        modal.transitionTo(new TroupeViews.Modal({ view: new SignupModalConfirmView({ email: data.email }) }));
      });

      view.on('login.prompt', function(options) {
        options.fromSignup = true;
        var loginView = new LoginModalView(options);
        loginView.on('login.complete', function(data) {
          window.location.href= data.redirectTo;
        });

        loginView.once('login.close', function(/*data*/) {
          modal.hide();
        });
        modal.transitionTo(new TroupeViews.Modal({ view: loginView }));

      });
      modal.show();

      return false;
    }

    if (window.profileHasNoUsername) {
      chooseUsername();
    }

    if (window.location.href.indexOf("passwordResetFailed") >= 0) {
      passwordResetFailed();
    }

    if (window.location.hash.indexOf("message") >= 0) {
      showMessage();
    }

    if (window.location.hash.indexOf("login") >= 0) {
      createLoginModal().show();
    }

    $('#button-signup, #button-signup2').on('click', function() {
      return signup();
    });

    $('#button-appstore').on('click', function () {
      window.open('https://itunes.apple.com/app/troupe/id632039322','new');
    });

    $('#button-existing-users-login').on('click', function() {
      createLoginModal().show();
      return false;
    });

    require([
      'utils/tracking'
    ], function() {
      // No need to do anything here
    });

});



