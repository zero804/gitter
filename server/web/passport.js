/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var _                      = require('underscore');
var userService            = require('../services/user-service');
var passport               = require('passport');
var winston                = require('winston');
var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
var BearerStrategy         = require('passport-http-bearer').Strategy;
var oauthService           = require('../services/oauth-service');
var statsService           = require("../services/stats-service");
var nconf                  = require('../utils/config');
var GoogleStrategy         = require('passport-google-oauth').OAuth2Strategy;
var useragentStats         = require('./useragent-stats');
var GitHubStrategy         = require('troupe-passport-github').Strategy;

module.exports = {
  install: function() {

    passport.serializeUser(function(user, done) {
      done(null, user.id);
    });

    passport.deserializeUser(function deserializeUserCallback(id, done) {
      userService.findById(id, function findUserByIdCallback(err, user) {
        if(err) return done(err);
        if(!user) return done(null, false);

        /* Todo: consider using a seperate object for the security user */
        return done(null, user);
      });

    });


    /* OAuth Strategies */


    /**
     * BasicStrategy & ClientPasswordStrategy
     *
     * These strategies are used to authenticate registered OAuth clients.  They are
     * employed to protect the `token` endpoint, which consumers use to obtain
     * access tokens.  The OAuth 2.0 specification suggests that clients use the
     * HTTP Basic scheme to authenticate.  Use of the client password strategy
     * allows clients to send the same credentials in the request body (as opposed
     * to the `Authorization` header).  While this approach is not recommended by
     * the specification, in practice it is quite common.
     */

    passport.use(new ClientPasswordStrategy(
      function(clientKey, clientSecret, done) {
        oauthService.findClientByClientKey(clientKey, function(err, client) {
          if (err) { return done(err); }
          if (!client) { return done(null, false); }
          if (client.clientSecret != clientSecret) { return done(null, false); }

          return done(null, client);
        });
      }
    ));

    /**
     * BearerStrategy
     *
     * This strategy is used to authenticate users based on an access token (aka a
     * bearer token).  The user must have previously authorized a client
     * application, which is issued an access token to make requests on behalf of
     * the authorizing user.
     */
    passport.use(new BearerStrategy(
      function(accessToken, done) {
        oauthService.findAccessToken(accessToken, function(err, token) {
          if (err) {
            winston.error("passport: Access token find failed", { exception: err });
            return done(err);
          }

          if (!token) {
            winston.info("passport: Access token presented does not exist", { exception: err });
            return done(null, false);
          }

          userService.findById(token.userId, function(err, user) {
            if (err) { return done(err); }
            if (!user) { return done(null, false); }

            // to keep this example simple, restricted scopes are not implemented,
            // and this is just for illustrative purposes
            var info = { scope: '*' };
            done(null, user, info);
          });
        });
      }
    ));


    passport.use(new GoogleStrategy({
        clientID:     nconf.get('googleoauth2:client_id'),
        clientSecret: nconf.get('googleoauth2:client_secret'),
        callbackURL:  nconf.get('web:basepath') + '/oauth2callback',
        passReqToCallback: true
      },

      function(req, accessToken, refreshToken, profile, done) {

        if (req.user) {
          // Save the access token in the request
          req.googleAccessToken = accessToken;

          if (!refreshToken) {
            winston.info('passport: Refresh token not available');
            return done(null, req.user);
          }

          req.user.googleRefreshToken = refreshToken;
          req.user.save(function(err) {
            winston.info('passport: User updated with token');
            if(err) done(err);
            return done(null, req.user);
          });

        } else {
          return userService.findByEmail(profile._json.email)
            .then(function(user) {
              if(user) {

                // Tracking
                var properties = useragentStats(req.headers['user-agent']);
                statsService.userUpdate(user, properties);

                statsService.event("user_login", _.extend({
                  userId: user.id,
                  method: 'google_oauth',
                  email: user.email
                }, properties));

                // Confirm the user email, even if she tried to sign-up
                // manually in the past and didn't do it.
                if (user.status == 'UNCONFIRMED') {
                  user.status = 'PROFILE_NOT_COMPLETED';
                  user.source = 'landing_google';
                  user.save(function(err) {
                    if (err) winston.error("Something went wrong confirming user " + user.email + ": " + err);
                  });
                }

                req.logIn(user, function(err) {
                  if (err) { return done(err); }
                  return done(null, user);
                });

                return;
              }

              // This is in fact a new user
              var googleUser = {
                displayName:        profile._json.name,
                email:              profile._json.email,
                gravatarImageUrl:   profile._json.picture,
                googleRefreshToken: refreshToken,
                status:             'PROFILE_NOT_COMPLETED',
                source:             'landing_google'
              };

              winston.verbose('About to create Google user ', googleUser);

              userService.findOrCreateUserForEmail(googleUser, function(err, user) {
                if (err) return done(err);

                winston.verbose('Created Google user ', user.toObject());

                req.logIn(user, function(err) {
                  if (err) { return done(err); }
                  return done(null, user);
                });
              });
            });
        }

      }
    ));

    function githubOauthCallback(req, accessToken, refreshToken, params, profile, done) {
      var requestedScopes = params.scope.split(/,/);
      var scopeHash = requestedScopes.reduce(function(memo, v) { memo[v] = true; return memo; }, {});

      if (req.user && req.session.githubScopeUpgrade) {
        req.user.githubToken = accessToken;
        req.user.githubScopes = scopeHash;

        req.user.save(function(err) {
          winston.info('passport: User updated with token');
          if(err) done(err);
          return done(null, req.user);
        });

      } else {
        return userService.findByGithubIdOrUsername(profile._json.id, profile._json.login)
          .then(function(user) {
            // Update an existing user
            if(user) {
              user.username         = profile._json.login;
              user.displayName      = profile._json.name || profile._json.login;
              user.gravatarImageUrl = profile._json.avatar_url;
              user.githubId         = profile._json.id;
              user.githubUserToken  = accessToken;

              user.save(function(err) {
                if (err) winston.error("Failed to update GH token for user ", user.username);

                // Tracking
                var properties = useragentStats(req.headers['user-agent']);
                statsService.userUpdate(user, properties);

                statsService.event("user_login", _.extend({
                  userId: user.id,
                  method: 'github_oauth',
                  username: user.username
                }, properties));

                // Login
                req.logIn(user, function(err) {
                  if (err) { return done(err); }
                  return done(null, user);
                });

              });

              return;
            }

            // This is in fact a new user
            var githubUser = {
              username:           profile._json.login,
              displayName:        profile._json.name || profile._json.login,
              emails:             profile._json.email ? [profile._json.email] : [],
              gravatarImageUrl:   profile._json.avatar_url,
              githubUserToken:    accessToken,
              githubId:           profile._json.id,
              status:             'ACTIVE',
              source:             'landing_github'
            };


            winston.verbose('About to create GitHub user ', githubUser);

            userService.findOrCreateUserForGithubId(githubUser, function(err, user) {
              if (err) return done(err);

              winston.verbose('Created GitHub user ', user.toObject());

              req.logIn(user, function(err) {
                if (err) { return done(err); }
                return done(null, user);
              });
            });
          });
      }

    }

    var userStrategy = new GitHubStrategy({
        clientID:     nconf.get('github:user_client_id'),
        clientSecret: nconf.get('github:user_client_secret'),
        callbackURL:  nconf.get('web:basepath') + '/login/callback',
        passReqToCallback: true
      }, githubOauthCallback);
    userStrategy.name = 'github_user';
    passport.use(userStrategy);

    var upgradeStrategy = new GitHubStrategy({
        clientID:     nconf.get('github:client_id'),
        clientSecret: nconf.get('github:client_secret'),
        callbackURL:  nconf.get('web:basepath') + '/login/callback',
        passReqToCallback: true
      }, githubOauthCallback);
    upgradeStrategy.name = 'github_upgrade';
    passport.use(upgradeStrategy);

  }

};
