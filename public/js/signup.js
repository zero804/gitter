require.config(window.require_config);

require(
    [
    'jquery',
    'views/base',
    'views/signup/signupModalView',
    'views/signup/signupModalConfirmView',
    'views/login/loginModalView',
    'jquery_validate' ],
    function($, TroupeViews, SignupModalView, SignupModalConfirmView, LoginModalView) {
      var loginFormVisible = false;

      var validationErrors = {};
      function attachTooltipHandlerToItem(index, el) {
        var jel = $(el);
          jel.tooltip({title: function() {
            var v = validationErrors[el.name];
            return v ? v:"";
          }});
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

        modal.show();
        return false;
      });
});

