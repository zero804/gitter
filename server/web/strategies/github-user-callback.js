"use strict";

var env = require('gitter-web-env');
var stats = env.stats;
var logger = env.logger;
var errorReporter = env.errorReporter;

var moment = require('moment');
var _ = require('underscore');
var GitHubMeService = require('gitter-web-github').GitHubMeService;
var userService = require('../../services/user-service');
var userSettingsService = require('../../services/user-settings-service');
var gaCookieParser = require('../../utils/ga-cookie-parser');
var useragentTagger = require('../../utils/user-agent-tagger');
var mixpanel = require('../../web/mixpanelUtils');
var extractGravatarVersion = require('../../utils/extract-gravatar-version');
var emailAddressService = require('../../services/email-address-service');
var debug = require('debug')('gitter:passport');

var Promise = require('bluebird');


function updateUserLocaleFromRequest(req, user) {
  if (req.i18n && req.i18n.locale) {
    userSettingsService.setUserSettings(user.id, 'lang', req.i18n.locale)
      .catch(function(err) {
        logger.error("Failed to save lang user setting", {
          userId: user.id,
          lang: req.i18n.locale,
          exception: err
        });
      });
  }
}

function trackNewUser(req, user) {
  // NOTE: tracking a signup after an invite is separate to this
  emailAddressService(user)
    .then(function(email) {
      // this is only set because stats.userUpdate requires it
      user.email = email;
      stats.userUpdate(user);

      // NOTE: other stats calls also pass in properties
      stats.event("new_user", {
        userId: user.id,
        email: email,
        method: 'github_oauth',
        username: user.username,
        source: req.session.source,
        googleAnalyticsUniqueId: gaCookieParser(req)
      });
    });
}

function trackUserLogin(req, user) {
  emailAddressService(user)
    .then(function(email) {
      var properties = useragentTagger(req.headers['user-agent']);

      // this is only set because stats.userUpdate requires it
      user.email = email;
      stats.userUpdate(user, properties);

      // NOTE: other stats calls also pass in source and googleAnalyticsUniqueId
      stats.event("user_login", _.extend({
        userId: user.id,
        method: 'github_oauth',
        username: user.username
      }, properties));
    });
}

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

  user.username         = githubUserProfile.login;
  user.displayName      = githubUserProfile.name || githubUserProfile.login;
  user.gravatarImageUrl = githubUserProfile.avatar_url;
  user.githubId         = githubUserProfile.id;
  var gravatarVersion   = extractGravatarVersion(githubUserProfile.avatar_url);
  if (gravatarVersion) {
    user.gravatarVersion = extractGravatarVersion(githubUserProfile.avatar_url);
  }
  user.githubUserToken  = accessToken;
  user.state            = undefined;

  return user.save()
    .then(function() {
      trackUserLogin(req, user);

      updateUserLocaleFromRequest(req, user);

      // NOTE: tried with {context: req} so that .call() isn't needed, but it
      // wouldn't work
      var login = Promise.promisify(req.logIn);
      return login.call(req, user);
    })
    .then(function() {
      // Remove the old token for this user
      req.accessToken = null;
      return user;
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

  var user;
  return userService.findOrCreateUserForGithubId(githubUser)
    .then(function(_user) {
      user = _user;

      debug('Created GitHub user %j', user.toObject());

      updateUserLocaleFromRequest(req, user);

      // IMPORTANT: The alias can only happen ONCE. Do not remove.
      stats.alias(mixpanel.getMixpanelDistinctId(req.cookies), user.id, function(err) {
        if (err) logger.error('Error aliasing user:', { exception: err });

        trackNewUser(req, user);

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

      // NOTE: tried with {context: req} so that .call() isn't needed, but it
      // wouldn't work
      var login = Promise.promisify(req.logIn);
      return login.call(req, user);
    })
    .then(function() {
      return user;
    });
}

function githubUserCallback(req, accessToken, refreshToken, params, _profile, done) {
  var githubMeService = new GitHubMeService({ githubUserToken: accessToken });
  var githubUserProfile;
  return githubMeService.getUser()
    .then(function(_githubUserProfile) {
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
    .then(function(user) {
      done(null, user);
    })
    .catch(function(err) {
      errorReporter(err, { oauth: "failed" }, { module: 'passport' });
      stats.event("oauth_profile.error");
      logger.error('Error during oauth process. Unable to obtain user profile.', err);
      return done(err);
    });
}

module.exports = githubUserCallback;
