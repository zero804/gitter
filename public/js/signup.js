/*jshint unused:true browser:true*/
require([
  'jquery',
  'views/base',
  'views/signup/signupModalView',
  'views/signup/signupModalConfirmView',
  'views/login/loginModalView',
  'jquery_validate' // No ref!
 ],
  function($, TroupeViews, SignupModalView, SignupModalConfirmView, LoginModalView) {
    var loginFormVisible = false;

    function createLoginModal() {
      var view = new LoginModalView({ fromSignup:true });
      var modal = new TroupeViews.Modal({ view: view });
      view.on('login.complete', function(data) {
        modal.off('login.complete');

        window.location.href= data.redirectTo;
      });

      view.on('login.close', function(data) {
        modal.off('login.close');
        modal.hide();
      });
      return modal;
    }

    var validationErrors = {};
    function attachTooltipHandlerToItem(index, el) {
      var jel = $(el);
        jel.tooltip({title: function() {
          var v = validationErrors[el.name];
          return v ? v:"";
        }});
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
    }

    $('.button-signup').on('click', function() {
      var view = new SignupModalView({existingUser: false});
      var modal = new TroupeViews.Modal({ view: view });
      view.on('signup.complete', function(data) {
        modal.off('signup.complete');

        modal.transitionTo(new TroupeViews.Modal({ view: new SignupModalConfirmView({ data: data }) }));
      });

      modal.show();
      return false;
    });


    $('.button-existing-users-login').on('click', function() {
      var modal = createLoginModal();
      modal.show();
      return false;
    });
});

