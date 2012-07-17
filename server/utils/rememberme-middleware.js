/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var uuid = require('node-uuid'),
    sechash = require('sechash'),
    winston = require('./winston'),
    redis = require("redis");

var redisClient = redis.createClient();

function generateAuthToken(req, res, userId, options, callback) {
  options = options ? options : {};
  var timeToLiveDays = options.timeToLiveDays ? options.timeToLiveDays : 30;

  var key = uuid.v4();
  var token = uuid.v4();
  res.cookie('auth', key + ":" + token, { 
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
      function fail() {
        res.clearCookie("auth");
        return next();
      }

      /* If the user is logged in, no problem */
      if (req.user) return next();

      /* Auth cookie */
      if(!req.cookies.auth) return next();

      winston.info('Client has presented a rememberme auth cookie, attempting reauthentication');

      var authToken = req.cookies.auth.split(":", 2);

      var key = authToken[0];
      var hash = authToken[1];

      redisClient.get("rememberme:" + key, function(err, storedValue) {
        if(err) return fail();
        if(!storedValue) return fail();

        redisClient.del("rememberme:" + key);

        var stored = JSON.parse(storedValue);

        sechash.testHash(hash, stored.hash, function(err, match) {
          if(err || !match) return fail();
          var userId = stored.userId;
          req._passport.instance.deserializeUser(userId, function(err, user) {
            if (err)  return fail();
            req._passport.session.user = userId;
            req.user = user;
            res.clearCookie("auth");
            generateAuthToken(req, res, userId, options, function(err) {
              next(err);
            });
          });

        });

      });

    };
  }
};
