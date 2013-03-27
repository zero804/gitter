/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var uuid = require('node-uuid'),
    sechash = require('sechash'),
    winston = require('winston'),
    redis = require("../utils/redis"),
    nconf = require('../utils/config'),
    userService = require('../services/user-service');
var statsService = require("../services/stats-service");

var cookieName = nconf.get('web:cookiePrefix') + 'auth';

var redisClient = redis.createClient();

function generateAuthToken(req, res, userId, options, callback) {
  options = options ? options : {};
  var timeToLiveDays = options.timeToLiveDays ? options.timeToLiveDays : 30;

  var key = uuid.v4();
  var token = uuid.v4();
  res.cookie(cookieName, key + ":" + token, {
    domain: nconf.get("web:cookieDomain"),
    maxAge: 1000 * 60 * 60 * 24 * timeToLiveDays,
    secure: false,
    httpOnly: true
  });

  sechash.strongHash('sha512', token, function(err, hash3) {
    winston.info("Storing hash for rememberme auth token");

    if(err) return callback(err);

    var json = JSON.stringify({userId: userId, hash: hash3});
    redisClient.setex("rememberme:" + key, 60 * 60 * 24 * timeToLiveDays, json);

    callback(null);
  });
}

module.exports = {
  generateAuthToken: generateAuthToken,

  rememberMeMiddleware: function(options) {
    return function(req, res, next) {
      function fail(err) {
        res.clearCookie(cookieName);
        if(err) return next(err);

        return next();
      }

      /* If the user is logged in, no problem */
      if (req.user) return next();

      var authCookieValue = req.cookies[cookieName];

      /* Auth cookie */
      if(!authCookieValue) return next();

      winston.info('rememberme: Client has presented a rememberme auth cookie, attempting reauthentication');

      var authToken = authCookieValue.split(":", 2);

      var key = authToken[0];
      var hash = authToken[1];

      redisClient.get("rememberme:" + key, function(err, storedValue) {
        if(err) return fail();
        if(!storedValue) {
          statsService.event('user_login_auto_illegal', { });

          winston.info("rememberme: Client presented illegal rememberme token ", { token: key });
          return fail();
        }

        redisClient.del("rememberme:" + key);

        var stored = JSON.parse(storedValue);

        sechash.testHash(hash, stored.hash, function(err, match) {
          if(err || !match) return fail();
          var userId = stored.userId;
          userService.findById(userId, function(err, user) {
            if(err)  return fail(err);
            if(!user) return fail();

            req.login(user, options, function(err) {
              if(err) {
                winston.info("rememberme: Passport login failed", { exception: err  });
                return fail(err);
              }

              winston.info("rememberme: Passport login succeeded");

              statsService.event('user_login_auto', { userId: userId });

              generateAuthToken(req, res, userId, options, function(err) {
                next(err);
              });

            });

          });

        });

      });

    };
  }
};
