/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var winston         = require("winston");
var troupeService   = require("../../services/troupe-service");
var inviteService   = require("../../services/invite-service");
var middleware      = require('../../web/middleware');
var appRender       = require('./render');
var appMiddleware   = require('./middleware');

var Q = require('q');

function acceptInviteWithoutConfirmation(req, res, next) {
  var appUri = req.params.appUri || 'one-one/' + req.params.userId;

  if(!req.user) {
    req.loginToAccept = true;
    return appRender.renderAppPageWithTroupe(req, res, next, 'app-template');
  }

  var uriContext = req.uriContext;

  // If theres a troupe, theres nothing to accept
  if(uriContext.troupe) {
    return troupeService.getUrlForTroupeForUserId(uriContext.troupe, req.user.id)
      .then(function(url) {
        if(!url) throw 404;
        res.relativeRedirect(url);
      })
      .fail(next);
  }

  // If there's an invite, accept it
  if(uriContext.invite) {
    return inviteService.acceptInviteForAuthenticatedUser(req.user, uriContext.invite)
      .then(function() {
        res.relativeRedirect("/" + appUri);
      })
      .fail(next);
  }

  // Otherwise just go there
  res.relativeRedirect("/" + appUri);
}

function acceptInviteWithConfirmation(req, res) {
  var appUri = req.params.appUri || 'one-one/' + req.params.userId;
  var confirmationCode = req.params.confirmationCode;
  var login = Q.nbind(req.login, req);

  inviteService.findInviteByConfirmationCode(confirmationCode)
    .then(function(invite) {
      if(!invite) throw 404;

      if(req.user) {
        return inviteService.acceptInviteForAuthenticatedUser(req.user, invite);
      } else {
        // we (must and) have given the user an opportunity to login before coming to this handler
      }

      return inviteService.acceptInvite(confirmationCode, appUri)
        .then(function(result) {
          var user = result.user;

          // Now that we've accept the invite, log the new user in
          if(user) return login(user);
        });

    })
    .fail(function(err) {
      winston.error('acceptInvite failed', { exception: err });
      return null;
    })
    .then(function() {
      res.relativeRedirect("/" + appUri);
    });
}

// show a prompt dialog to either login or create a new account
function acceptNewUserInviteLanding(req, res, next) {
  var confirmationCode = req.params.confirmationCode;
  var appUri = req.params.appUri || 'one-one/' + req.params.userId;
  var user = req.user;
  var login = Q.nbind(req.login, req);

  if(user) {
    return inviteService.findInviteByConfirmationCode(confirmationCode)
      .then(function(invite) {
        /* Can't find the invite? Ignore */
        if(!invite) return;

        return inviteService.acceptInviteForAuthenticatedUser(user, invite);
      })
      .then(function() {
        return res.relativeRedirect("/" + appUri);
      });
  }

  /* We have an unauthenticated user. Has the invite been used before? */
  return inviteService.findNewOrUsedInviteByConfirmationCode(confirmationCode)
    .then(function(inviteInfo) {
      if(!inviteInfo) {
        winston.error('Invite with confirmation code not found. Redirecting the user to appUri', { confirmationCode: confirmationCode, appUri: appUri });
        return "redirect";
      }

      if(!inviteInfo.used) {
        return "prompt";
      }

      return inviteService.acceptInvite(confirmationCode, appUri)
        .then(function(result) {
          var user = result.user;

          // Now that we've accept the invite, log the new user in
          if(user) return login(user);
        })
        .thenResolve("redirect");


    })
    .fail(function(err) {
      winston.error('Unable to accept invite. An error occurred', { exception: err });
      return "redirect";
    })
    .then(function(action) {
      switch(action) {
        case "redirect":
          return res.relativeRedirect("/" + appUri);
        case "prompt":
          return appRender.renderAcceptInvitePage(req, res, next);
      }

      winston.error("Unexpected action while accepting invite" + action);
      return appRender.renderAcceptInvitePage(req, res, next);
    });

}

module.exports = {
    install: function(app) {
      app.get('/:appUri/accept/',
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        appMiddleware.uriContextResolverMiddleware,
        acceptInviteWithoutConfirmation);

      app.get('/one-one/:userId/accept/',
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        appMiddleware.preloadOneToOneTroupeMiddleware,
        acceptInviteWithoutConfirmation);


      // will require the user is logged in, who will then inherit the invite
      app.get('/:appUri/accept/:confirmationCode/login',
        middleware.ensureLoggedIn(),
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        acceptInviteWithConfirmation);

      // will create a new account for the invite (or login the user it already belongs to)
      app.get('/:appUri/accept/:confirmationCode/signup',
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        acceptInviteWithConfirmation);

      // prompt whether the user wants to login to accept invite or create a new account
      app.get('/:appUri/accept/:confirmationCode',
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        acceptNewUserInviteLanding);

      /* one to one accept */

      app.get('/one-one/:userId/accept/:confirmationCode/login',
        middleware.ensureLoggedIn(),
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        acceptInviteWithConfirmation);

      app.get('/one-one/:userId/accept/:confirmationCode/signup',
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        acceptInviteWithConfirmation);

      app.get('/one-one/:userId/accept/:confirmationCode',
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        acceptNewUserInviteLanding);

    }
};
