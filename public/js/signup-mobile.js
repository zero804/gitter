require([
  'jquery',
  'views/signup/signupModalView',
  'views/signup/signupModalConfirmView'
  ], function($, SignupModalView, SignupModalConfirmView) {

    var view = new SignupModalView({el: $('#signup-form')});
    view.once('signup.complete', function(data) {
      view.remove();
      new SignupModalConfirmView({
        el: $('#signup-confirmation'),
        data: data
      }).render();
    });

    view.render();
});
