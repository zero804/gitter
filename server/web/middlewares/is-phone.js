"use strict";

var isPhone = require('../is-phone');

function isPhoneMiddleware(req, res, next) {
  req.isPhone = isPhone(req) || (req.fflip && req.fflip.has('force-phone'));
  next();
}

module.exports = isPhoneMiddleware;
