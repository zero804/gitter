/*jshint unused:true, browser:true */
require([
  'jquery',
  'views/base',
  'views/signup/signupModalView',
  'views/signup/signupModalConfirmView',
  'views/login/loginModalView',
  'views/signup/createTroupeView',
  'jquery_validate', // No ref!
  'retina'
 ],
  function($, TroupeViews, SignupModalView, SignupModalConfirmView, LoginModalView, createTroupeView) {
    //var loginFormVisible = false;

    function createLoginModal() {
      var view = new LoginModalView({ fromSignup:true });
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

    if (window.location.href.indexOf("passwordResetFailed") >= 0) {
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
    } else if(window.noValidTroupes) {
      var modal = new TroupeViews.ConfirmationModal({
        title: "No Troupes yet...",
        body: "Click 'Get Started' to create your first Troupe",
        buttons: [{
          id: 'no-troupes-ok', text: 'OK'
        }]
      });

      modal.on('button.click', function(id) {
        if (id == 'no-troupes-ok')
          modal.hide();
      });

      modal.show();
    }

    $('#button-signup').on('click', function() {
      if (window.noValidTroupes) {
        new createTroupeView.Modal({existingUser: true, userId: window.userId }).show();
      } else {
        var view = new SignupModalView({existingUser: false});
        var modal = new TroupeViews.Modal({ view: view });
        view.once('signup.complete', function(data) {
          modal.transitionTo(new TroupeViews.Modal({ view: new SignupModalConfirmView({ data: data }) }));
        });

        modal.show();
      }
      return false;
    });

    $('#button-appstore').on('click', function () {
      alert("Coming soon.");
    });

    $('#button-existing-users-login').on('click', function() {
      var modal = createLoginModal();
      modal.show();
      return false;
    });

    require([
      'utils/tracking'
    ], function(tracking) {
      // No need to do anything here
    });

});



