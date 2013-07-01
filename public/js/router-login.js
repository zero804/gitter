/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
require([
  'jquery',
  'underscore',
  'utils/context',
  'backbone',
  'log!router-login',
  './base-router',
  'views/base',
  'views/invite/inviteModal',
  'views/login/loginModalView',
  'views/profile/profileView',
  'views/login/loginRequestModalView',
  'views/signup/signupModalConfirmView',
  'views/connect/connectUserView',
  'collections/troupes'
], function($, _, context, Backbone, log, BaseRouter, TroupeViews, InviteModal, LoginModalView, profileView, RequestModalView, SignupModalConfirmView, ConnectUserModalView, troupeModels) {
  "use strict";

  var AppRouter = BaseRouter.extend({
    routes: {
      '*actions': 'defaultAction'
    },

    defaultAction: function(/*actions*/) {
      $('#primary-view').html('');

      var view, modal, loginModal, requestModal, inviteId;

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

        requestModal.view.on('confirm.request', function(options) {
          var data = {};
          data.email = options.userEmail;
          requestModal.transitionTo(new TroupeViews.Modal({ disableClose: true, view: new SignupModalConfirmView({ data: data }) }));
        });

        return requestModal;
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


      // If the user is accessing another user's home url (trou.pe/user)
      if(window.troupeContext.homeUser) {
        log("Ok, going 1:1");
        // If the user doesn't have permission to talk to this user, show the Connect modal
        if(window.troupeContext.accessDenied) {
          log("User doesn't have permission");
          inviteId = window.troupeContext.inviteId;
          if (inviteId) {
            log("User has an invite, let's show the accept modal");
            // if the user has an invite to this troupe show the invite accept / reject modal
            new InviteModal({ inviteId: inviteId }).show();
          } else {
              log("User needs to request access");
              view = new ConnectUserModalView({ authenticated: !!window.troupeContext.user });
              var connectUserModal = new TroupeViews.Modal({ view: view, disableClose: true });
              connectUserModal.show();

              connectUserModal.view.on('request.login', function() {
                var loginModal = getLoginModal({email: window.localStorage.defaultTroupeEmail});
                connectUserModal.transitionTo(loginModal);
              });
            }
        } else {
          log("Everything looks good, let's load the Troupe");
          return;
        }
      // The user must be accessing a Troupe
      } else {
        // If the user isn't signed in, show the login modal
        if (!window.troupeContext.user) {
          getLoginModal({ email: window.localStorage.defaultTroupeEmail } );
          loginModal.show();
          return;
        }
        else {
          log("Accessing a Troupe");
          /* This user is NOT logged in and is visiting a Troupe */
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

            var inviteId = window.troupeContext.inviteId;
            if (inviteId) {
              // if the user has an invite to this troupe show the invite accept / reject modal
              (new InviteModal({ inviteId: inviteId })).show();
            } else {
              // if the user is trying to access another use profile (e.g. trou.pe/user) and is not connected
              // show the user connect modal
              log("Show request modal");

              view = new RequestModalView({ authenticated: true });
              modal = new TroupeViews.Modal({ view: view, disableClose: true });
              modal.show();
            }
            return;
          }
        }
      }
    }

  });

  var troupeApp = new AppRouter();
  window.troupeApp = troupeApp;
  Backbone.history.start();

});
