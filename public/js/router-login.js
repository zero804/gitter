/*jshint unused:true browser:true*/
require([
  'jquery',
  'underscore',
  'backbone',
  './base-router',
  'views/base',
  'views/login/loginModalView',
  'views/profile/profileView',
  'views/login/loginRequestModalView'
], function($, _, Backbone, BaseRouter, TroupeViews, LoginModalView, profileView, RequestModalView) {
  "use strict";

  var AppRouter = BaseRouter.extend({
    routes: {
      '*actions': 'defaultAction'
    },

    defaultAction: function(/*actions*/) {
      $('#primary-view').html('');

      var view, modal, loginModal, requestModal, profileModal;

      function getLoginModal(email) {
        var loginView = new LoginModalView( { email: email });
        loginModal = new TroupeViews.Modal({ view: loginView, disableClose: true });
        loginView.on('login.complete', function() {
          loginView.off('login.complete');
          window.location.reload();
        });
        loginModal.view.on('request.access', function() {
          getRequestModal();
          loginModal.transitionTo(requestModal);
        });

        return loginModal;
      }

      function getRequestModal() {
        requestModal = new TroupeViews.Modal({ view: new RequestModalView({ }), disableClose: true });
        requestModal.view.on('request.login', function() {
          //modal.off('request.login');
          getLoginModal("");
          requestModal.transitionTo(loginModal);
        });

        return requestModal;
      }

      /* Is a user logged in? */
      if(!window.troupeContext.user) {
        if (window.localStorage.defaultTroupeEmail) {
          // show the login dialog
          getLoginModal(window.localStorage.defaultTroupeEmail);
          loginModal.show();
          return;
        }
        else {
          // show the request access modal
          getRequestModal();

          requestModal.show();
          return;
        }
      }

      if(window.troupeContext.profileNotCompleted) {
        view = new profileView.Modal({ disableClose: true  });

        view.on('close', function() {
          view.off('close');
          //modal.close();
          window.location.reload(true);
        });
        view.show();
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

  var troupeApp = new AppRouter();
  window.troupeApp = troupeApp;
  Backbone.history.start();

});
