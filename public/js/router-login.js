// Filename: router.js
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'views/login/loginModalView',
  'views/profile/profileModalView',
  'views/login/loginRequestModalView',
  'views/login/loginRequestConfirmModalView'
], function($, _, Backbone, TroupeViews, LoginModalView, ProfileModalView, RequestModalView, RequestConfirmModalView) {
  "use strict";

  return Backbone.Router.extend({
    routes: {
      '*actions': 'defaultAction'
    },

    defaultAction: function(actions) {
      $('#primary-view').html('');
      var view, modal;
      /* Is a user logged in? */
      if(!window.troupeContext.user) {
        view = new RequestModalView({ });
        modal = new TroupeViews.Modal({ view: view, disableClose: true });
  
        view.on('request.complete', function(data) {
          modal.off('request.complete');
          modal.transitionTo(new TroupeViews.Modal({ view: new RequestConfirmModalView({ data: data }), disableClose: true }));
        });

        view.on('request.login', function(data) {
          modal.off('request.login');
          //maybe wrong
          if (!data) data = {};
          var loginView = new LoginModalView( { email: data.email });
          var loginModal = new TroupeViews.Modal({ view: loginView, disableClose: true });
          loginView.on('login.complete', function(data) {
            modal.off('login.complete');
            window.location.href="/" + data.defaultTroupe.uri;
          });

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

        view.on('request.complete', function(data) {
          modal.off('request.complete');
          var confirmDialog = new TroupeViews.Modal({ view: new RequestConfirmModalView({ data: data }), disableClose: false });
          confirmDialog.on('hidden', function() {
            confirmDialog.off('hidden');
            window.location.href = '/x';
          });
          modal.transitionTo(confirmDialog);
        });

        modal.show();
        return;
      }
    }

  });
});
