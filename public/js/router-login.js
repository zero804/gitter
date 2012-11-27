// Filename: router.js
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'views/login/loginModalView',
  'views/profile/profileModalView',
  'views/login/loginRequestModalView'
], function($, _, Backbone, TroupeViews, LoginModalView, ProfileModalView, RequestModalView) {
  "use strict";

  return Backbone.Router.extend({
    routes: {
      '*actions': 'defaultAction'
    },


    defaultAction: function(actions) {
      $('#primary-view').html('');
      var view, modal;

      function createLoginModal(email) {
        var loginView = new LoginModalView( { email: email });
        var loginModal = new TroupeViews.Modal({ view: loginView, disableClose: true });
        loginView.on('login.complete', function(data) {
          loginView.off('login.complete');
          window.location.href = data.redirectTo;
        });
        return loginModal;
      }

      /* Is a user logged in? */
      if(!window.troupeContext.user) {
        if (window.localStorage.defaultTroupeEmail) {
          var modal1 = createLoginModal(window.localStorage.defaultTroupeEmail);
          modal1.show();
          return;
        }

        view = new RequestModalView({ });
        modal = new TroupeViews.Modal({ view: view, disableClose: true });

        view.on('request.login', function(data) {
          modal.off('request.login');
          if (!data) data = {};
          var loginModal = createLoginModal("");
          modal.transitionTo(loginModal);
        });

        modal.show();
        return;
      }

      if(window.troupeContext.profileNotCompleted) {
        view = new ProfileModalView();
        modal = new TroupeViews.Modal({ view: view, disableClose: true  });

        view.on('profile.complete', function(data) {
          modal.off('profile.complete');
          modal.close();
          window.location.reload(true);
        });
        modal.show();
        return;
      }

      if(window.troupeContext.accessDenied) {
        view = new RequestModalView({ authenticated: true });
        modal = new TroupeViews.Modal({ view: view, disableClose: true });
        modal.show();
        return;
      }
    }

  });
});
