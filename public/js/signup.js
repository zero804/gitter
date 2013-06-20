/*jshint unused:true, browser:true */
require([
  'jquery',
  'views/base',
  'views/signup/usernameView',
  'views/signup/signupModalView',
  'views/signup/signupModalConfirmView',
  'views/login/loginModalView',
  'views/signup/createTroupeView',
  'views/app/messagesView',
  'utils/validate-wrapper', // No ref!
  'retina'
 ],
  function($, TroupeViews, UsernameView, SignupModalView, SignupModalConfirmView, LoginModalView, createTroupeView, MessagesView) {
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
        buttons: [
          {
            id: "retry-reset",
            text: "Back to login"
          }
        ]
      });

      modal.on('button.click', function() {
        modal.transitionTo(createLoginModal());
      });

      modal.on('close', function() {
        window.location.href = window.location.href.replace("passwordResetFailed","");
      });

      modal.show();
    }

    function showMessage() {
      var v = new MessagesView({ messageName : window.location.hash });
      v.show();
    }

    function chooseUsername() {
      (new TroupeViews.Modal({ view: new UsernameView(), disableClose: true })).show();
    }

    function signup() {

      if (window.profileHasNoUsername) {
        return chooseUsername();
      }

      var view = new SignupModalView();
      var modal = new TroupeViews.Modal({ view: view });

      view.once('signup.complete', function(data) {
        modal.transitionTo(new TroupeViews.Modal({ view: new SignupModalConfirmView({ data: data }) }));
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

    $('#button-signup, #button-signup2').on('click', function() {
      return signup();
    });

    $('#button-appstore').on('click', function () {
      window.open('https://itunes.apple.com/app/troupe/id632039322','new');
    });

    $('#button-existing-users-login').on('click', function() {
      $(document).trigger('login-prompt');
      return false;
    });

    $(document).on('login-prompt', function(ev, credentials) {
      createLoginModal({ email: (credentials) ? credentials.email : '' }).show();
    });

    require([
      'utils/tracking'
    ], function(tracking) {
      // No need to do anything here
    });

});



