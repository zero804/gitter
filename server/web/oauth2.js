/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

/**
 * Module dependencies.
 */
var oauth2orize = require('oauth2orize');
var passport = require('passport');
var oauthService = require('../services/oauth-service');
var loginUtils = require('./login-utils');
var winston = require('../utils/winston');
var languageSelector = require('./language-selector');
var random = require('../utils/random');
var ensureLoggedIn = require('./middlewares/ensure-logged-in');

// create OAuth 2.0 server
var server = oauth2orize.createServer();

// Register serialialization and deserialization functions.
//
// When a client redirects a user to user authorization endpoint, an
// authorization transaction is initiated.  To complete the transaction, the
// user must authenticate and approve the authorization request.  Because this
// may involve multiple HTTP request/response exchanges, the transaction is
// stored in the session.
//
// An application must supply serialization functions, which determine how the
// client object is serialized into the session.  Typically this will be a
// simple matter of serializing the client's Id, and deserializing by finding
// the client by Id from the database.

server.serializeClient(function(client, done) {
  return done(null, client.id);
});

server.deserializeClient(function(id, done) {
  oauthService.findClientById(id, function(err, client) {
    if (err) { return done(err); }
    return done(null, client);
  });
});

// Register supported grant types.
//
// OAuth 2.0 specifies a framework that allows users to grant client
// applications limited access to their protected resources.  It does this
// through a process of the user granting access, and the client exchanging
// the grant for an access token.

// Grant authorization codes.  The callback takes the `client` requesting
// authorization, the `redirectUri` (which is used as a verifier in the
// subsequent exchange), the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application.  The application issues a code, which is bound to these
// values, and will be exchanged for an access token.

server.grant(oauth2orize.grant.code(function(client, redirectUri, user, ares, done) {
  winston.info("Granted access to ", client.name, " for ", user.displayName);
  winston.info("Granted access to "+ client.name + " for " + user.displayName);

  random.generateToken(function(err, token) {
    if (err) { return done(err); }

    oauthService.saveAuthorizationCode(token, client, redirectUri, user, function(err) {
      if (err) { return done(err); }
      done(null, token);
    });
  });
}));

// Exchange authorization codes for access tokens.  The callback accepts the
// `client`, which is exchanging `code` and any `redirectUri` from the
// authorization request for verification.  If these values are validated, the
// application issues an access token on behalf of the user who authorized the
// code.

server.exchange(oauth2orize.exchange.code(function(client, code, redirectUri, done) {
  oauthService.findAuthorizationCode(code, function(err, authCode) {
    if (err) return done(err);
    if (!authCode) return done();

    if (!client._id.equals(authCode.clientId)) { return done(); }
    if (redirectUri !== authCode.redirectUri) { return done(); }

    random.generateToken(function(err, token) {
      if (err) { return done(err); }

      oauthService.saveAccessToken(token, authCode.userId, authCode.clientId, function(err) {
        if (err) { return done(err); }
        done(null, token);
      });
    });
  });
}));



// user authorization endpoint
//
// `authorization` middleware accepts a `validate` callback which is
// responsible for validating the client making the authorization request.  In
// doing so, is recommended that the `redirectUri` be checked against a
// registered value, although security requirements may vary accross
// implementations.  Once validated, the `done` callback must be invoked with
// a `client` instance, as well as the `redirectUri` to which the user will be
// redirected after an authorization decision is obtained.
//
// This middleware simply initializes a new authorization transaction.  It is
// the application's responsibility to authenticate the user and render a dialog
// to obtain their approval (displaying details about the client requesting
// authorization).  We accomplish that here by routing through `ensureLoggedIn()`
// first, and rendering the `dialog` view.

exports.authorization = [
  ensureLoggedIn,
  server.authorization(function(clientKey, redirectUri, done) {

    oauthService.findClientByClientKey(clientKey, function(err, client) {
      if (err) { return done(err); }
      if(!client) { return done("Illegal client"); }

      if(client.registeredRedirectUri !== redirectUri) {
        winston.warn("Provided redirectUri does not match registered URI for clientKey ", {
          redirectUri: redirectUri,
          registeredUri: client.registeredRedirectUri,
          clientKey: clientKey});
        return done("Redirect URL does not match");
      }
      return done(null, client, redirectUri);
    });
  }),
  function(req, res, next) {
    /* Is this client allowed to skip the authorization page? */
    if(req.oauth2.client.canSkipAuthorization) {
      return server.decision({ loadTransaction: false })(req, res, next);
    }

    /* Non-trusted Client */
    res.render('oauth_authorize_dialog', {
      transactionId: req.oauth2.transactionID,
      user: req.user,
      client: req.oauth2.client,
      lang: languageSelector(req)
    });
  }
];

// user decision endpoint
//
// `decision` middleware processes a user's decision to allow or deny access
// requested by a client application.  Based on the grant type requested by the
// client, the above grant middleware configured above will be invoked to send
// a response.

exports.decision = [
  ensureLoggedIn,
  server.decision()
];


// token endpoint
//
// `token` middleware handles client requests to exchange authorization grants
// for access tokens.  Based on the grant type being exchanged, the above
// exchange middleware will be invoked to handle the request.  Clients must
// authenticate when making requests to this endpoint.

exports.token = [
  passport.authenticate([/*'basic', */'oauth2-client-password'], { session: false }),
  server.token(),
  server.errorHandler()
];

// The bearer login is used by the embedded apps (like IOS) to prevent
//  the user needing to login via a login prompt when accessing the webapp
exports.bearerLogin = [
  passport.authenticate('bearer', { session: true }),
  function(req, res, next) {
    winston.info("oauth: user logged in via bearerLogin", { user: req.user.displayName });
    loginUtils.redirectUserToDefaultTroupe(req, res, next);
  }
];
