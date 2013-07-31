require([
  'jquery-hammer',
  'backbone',
  'views/signup/signupModalView',
  'views/signup/signupModalConfirmView'
  ], function($, BackBone, SignupModalView, SignupModalConfirmView) {

    var Router = Backbone.Router.extend({
      routes: {
        'signup': 'showSignup',
        '*path':  'defaultRoute'
      },

      showSignup: function() {
        $('#panelList').addClass('showingSecondPanel');
      },

      defaultRoute: function() {
        $('#panelList').removeClass('showingSecondPanel');
      }
    });

    var app = new Router();

    $('#signup').hammer().on('tap', function(event) {
      app.navigate('signup', {trigger: true});
      event.stopPropagation();
    });

    Backbone.history.start();

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
