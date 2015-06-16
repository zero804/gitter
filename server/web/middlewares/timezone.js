/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env           = require('../../utils/env');
var logger        = env.logger;
var errorReporter = env.errorReporter;
var userService   = require('../../services/user-service');
var debug         = require('debug')('gitter:timezone-middleware');

function parseOffset(value) {
  if (value.length !== 5) return;
  var sign = value[0];
  var hours = parseInt(value.substr(1,2), 10);
  var mins = parseInt(value.substr(3,2), 10);

  if (sign !== '+' && sign !== '-') return;
  if (isNaN(hours) || isNaN(mins)) return;

  return (sign === '-' ? -1 : 1) * hours * 60 + mins;
}

function parseTimezoneCookie(value) {
  if (!value) return;
  var parts = value.split(':');

  if (parts.length < 1) return;

  var offsetString = parts[0];
  var abbr = parts[1];
  var iana = parts[2];

  var offset = parseOffset(offsetString);
  if (offset === undefined) return;

  return { offset: offset, abbr: abbr, iana: iana };
}

function saveTzInfo(user, timezoneInfo) {
  debug("Saving timezone information for user %s: %j", user.username, timezoneInfo);
  userService.saveTzInfo(user._id, timezoneInfo)
    .catch(function(err) {
      logger.error("Unable to save timezone info for user", { exception: err });
      errorReporter(err, { user: user.username });
    });
}

module.exports = function(req, res, next) {
  // If the user has sent the cookie, and is authenticated,
  // compare the timezones and update accordingly
  var parsed = parseTimezoneCookie(req.cookies.gitter_tz);
  var userTz = req.user && req.user.tz;

  debug("User presented timezone cookie %j", parsed);

  if (parsed) {
    if (userTz) {
      // Its possible that the users browser can't do IANA,
      // so just used the saved value if possible

      if (userTz.offset === parsed.offset && userTz.abbr === parsed.abbr) {
        if (userTz.iana && !parsed.iana) {
          parsed.iana = userTz.iana;
        }
      }

      // Save the timezone information it has changed
      if (userTz.offset !== parsed.offset || userTz.abbr !== parsed.abbr ||  userTz.iana !== parsed.iana) {
        saveTzInfo(req.user, parsed);
      }

    } else if (req.user) {
      // The user doesn't have the tz information yet, so save it, async
      saveTzInfo(req.user, parsed);
    }


    res.locals.tz = parsed;
    res.locals.tzOffset = parsed.offset;

  } else {
    // No cookie, try the users' saved state
    if (userTz) {
      // Compare the user value to cookie value

      res.locals.tz = userTz;
      res.locals.tzOffset = userTz.offset;

    } else {
      // No cookie, no saved state
      res.locals.tzOffset = 0;
    }

  }

  // If the user has not sent the cookie, check if we know their timezone and use
  // that
  next();
};
