/*jshint unused:true, browser:true */
require([
  'jquery',
  'underscore',
  'backbone',
  './base-router',
  'views/base',
  'views/login/loginModalView',
  'views/profile/profileView',
  'views/login/loginRequestModalView',
  'collections/troupes'
], function($, _, Backbone, BaseRouter, TroupeViews, LoginModalView, profileView, RequestModalView, troupeModels) {
  "use strict";

  var AppRouter = BaseRouter.extend({
    routes: {
      '*actions': 'defaultAction'
    },

    defaultAction: function(/*actions*/) {
      $('#primary-view').html('');

      var view, modal, loginModal, requestModal;

      function getLoginModal(options) {
        var email = options.email;
        var userExists = options.userExists;

        var loginView = new LoginModalView( { email: email, userExists: userExists });
        loginModal = new TroupeViews.Modal({ view: loginView, disableClose: true });
        loginView.once('login.complete', function() {
          window.location.reload();
        });
        loginModal.view.on('request.access', function() {
          getRequestModal(loginModal.view.getEmail());
          loginModal.transitionTo(requestModal);
        });

        return loginModal;
      }

      function getRequestModal(email) {
        requestModal = new TroupeViews.Modal({ view: new RequestModalView({ email: email }), disableClose: true });
        requestModal.view.on('request.login', function(options) {
          getLoginModal({ email: requestModal.view.getEmail(), userExists: options && options.userExists });
          requestModal.transitionTo(loginModal);
        });

        return requestModal;
      }

      if(!window.troupeContext.user) {
        /* This user is NOT logged in */

        getLoginModal({ email: window.localStorage.defaultTroupeEmail } );
        loginModal.show();
        return;
      }

      if(window.troupeContext.profileNotCompleted) {
        view = new profileView.Modal({ disableClose: true  });

        view.once('close', function() {
          //modal.close();
          window.location.reload(true);
        });
        view.show();

        return;
      }

      if(window.troupeContext.accessDenied) {
        // Listen out for acceptance
        var troupeCollection = new troupeModels.TroupeCollection();
        troupeCollection.listen();
        troupeCollection.on("add", function(model) {

          if(model.get('uri') == window.troupeContext.troupeUri) {
            // TODO: tell the person that they've been kicked out of the troupe
            window.location.reload();
          }
        });

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
