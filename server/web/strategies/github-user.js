"use strict";

var env = require('gitter-web-env');
var config = env.config;
var errorReporter = env.errorReporter;
var stats = env.stats;
var logger = env.logger;

var moment = require('moment');
var GitHubStrategy = require('gitter-passport-github').Strategy;
var TokenStateProvider = require('gitter-passport-oauth2').TokenStateProvider;
var mixpanel = require('../../web/mixpanelUtils');
var extractGravatarVersion = require('../../utils/extract-gravatar-version');
var gaCookieParser = require('../ga-cookie-parser');
var userService = require('../../services/user-service');
var GitHubMeService = require('gitter-web-github').GitHubMeService;
var trackNewUser = require('../track-new-user');
var trackUserLogin = require('../track-user-login');
var updateUserLocale = require('../update-user-locale');
var debug = require('debug')('gitter:infra:passport');
var obfuscateToken = require('gitter-web-github').obfuscateToken;
var passportLogin = require('../passport-login');

// Move this out once we use it multiple times. We're only interested in
// account age for github users at this stage.
function ageInHours(date) {
  var ageHours;

  if (date) {
    var dateMoment = moment(date);
    var duration = moment.duration(Date.now() - dateMoment.valueOf());
    ageHours = duration.asHours();
  }

  return ageHours;
}

function updateUser(req, accessToken, user, githubUserProfile) {
  // If the user was in the DB already but was invited, notify stats services
  if (user.isInvited()) {
    // IMPORTANT: The alias can only happen ONCE. Do not remove.
    stats.alias(mixpanel.getMixpanelDistinctId(req.cookies), user.id, function(err) {
      if (err) logger.error('Error aliasing user:', { exception: err });

      stats.event("new_user", {
        userId: user.id,
        method: 'github_oauth',
        username: user.username,
        source: 'invited',
        googleAnalyticsUniqueId: gaCookieParser(req)
      });
    });
  }

  user.username = githubUserProfile.login;
  user.displayName = githubUserProfile.name || githubUserProfile.login;
  user.gravatarImageUrl = githubUserProfile.avatar_url;
  user.githubId = githubUserProfile.id;
  var gravatarVersion = extractGravatarVersion(githubUserProfile.avatar_url);
  if (gravatarVersion) {
    user.gravatarVersion = extractGravatarVersion(githubUserProfile.avatar_url);
  }
  user.githubUserToken = accessToken;
  user.state = undefined;

  return user.save()
    .then(function() {
      trackUserLogin(req, user, 'github');

      updateUserLocale(req, user);

      // Remove the old token for this user
      req.accessToken = null;

      return passportLogin(req, user);
    });
}

function addUser(req, accessToken, githubUserProfile) {
  var githubUser = {
    username:           githubUserProfile.login,
    displayName:        githubUserProfile.name || githubUserProfile.login,
    emails:             githubUserProfile.email ? [githubUserProfile.email] : [],
    gravatarImageUrl:   githubUserProfile.avatar_url,
    gravatarVersion:    extractGravatarVersion(githubUserProfile.avatar_url),
    githubUserToken:    accessToken,
    githubId:           githubUserProfile.id,
  };

  debug('About to create GitHub user %j', githubUser);

  return userService.findOrCreateUserForGithubId(githubUser)
    .then(function(user) {

      debug('Created GitHub user %j', user.toObject());

      updateUserLocale(req, user);

      // IMPORTANT: The alias can only happen ONCE. Do not remove.
      stats.alias(mixpanel.getMixpanelDistinctId(req.cookies), user.id, function(err) {
        if (err) logger.error('Error aliasing user:', { exception: err });

        trackNewUser(req, user, 'github');

        // Flag the user as a new github user if they've created their account
        // in the last two hours
        // NOTE: this relies on the fact that undefined is not smaller than 2..
        if (ageInHours(githubUserProfile.created_at) < 2) {
          stats.event("new_github_user", {
            userId: user.id,
            username: user.username,
            googleAnalyticsUniqueId: gaCookieParser(req)
          });
        }
      });

      return passportLogin(req, user);
    });
}

function githubUserCallback(req, accessToken, refreshToken, params, _profile, done) {
  var loggableToken = obfuscateToken(accessToken);

  logger.info('GitHub OAUTH succeeded', {
    accessToken: loggableToken
  });

  var githubMeService = new GitHubMeService({ githubUserToken: accessToken });
  var githubUserProfile;
  return githubMeService.getUser()
    .then(function(_githubUserProfile) {
      logger.info('GitHub profile obtained', {
        accessToken: loggableToken
      });

      githubUserProfile = _githubUserProfile;
      return userService.findByGithubIdOrUsername(githubUserProfile.id, githubUserProfile.login)
    })
    .then(function(user) {
      if (req.session && (!user || user.isInvited())) {
        var events = req.session.events;
        if (!events) {
          events = [];
          req.session.events = events;
        }
        events.push('new_user_signup');
      }

      // Update an existing user
      if (user) {
        return updateUser(req, accessToken, user, githubUserProfile);
      } else {
        return addUser(req, accessToken, githubUserProfile);
      }
    })
    .catch(function(err) {
      errorReporter(err, { oauth: "failed" }, { module: 'passport' });
      stats.event("oauth_profile.error");
      logger.error('Error during GitHub OAUTH process. Unable to obtain user profile.', {
        exception: err,
        accessToken: loggableToken
      });
      throw err;
    })
    .asCallback(done);
}

var githubUserStrategy = new GitHubStrategy({
    clientID: config.get('github:user_client_id'),
    clientSecret: config.get('github:user_client_secret'),
    callbackURL: config.get('web:basepath') + '/login/callback',
    stateProvider: new TokenStateProvider({ passphrase: config.get('github:statePassphrase') }),
    skipUserProfile: true,
    passReqToCallback: true
  }, githubUserCallback);

githubUserStrategy.name = 'github_user';

module.exports = githubUserStrategy;
