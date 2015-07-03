/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var setVariantCookie = function(req, res, next) {
  var variant = (((Math.floor(Math.random() * 2) + 1) % 2)) === 0 ? 'control' : 'treatment';
  if (!req.cookies.variant) res.cookie('variant', variant);
  req.variant = req.cookies.variant || variant;

  return next();
};

module.exports = setVariantCookie;
