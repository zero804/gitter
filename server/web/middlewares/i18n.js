"use strict";

var env = require('gitter-web-env');
var config = env.config;
var I18n = require('i18n-2');
var i18nFactory = require('../../utils/i18n-factory');

var homepagePath = config.get('web:homeurl');

function getI18n(req) {
  if(req.path === homepagePath) {
    return i18nFactory.getHomePage(req);
  }

  return i18nFactory.get(req);

}
module.exports = function(req, res, next) {
  var i18n = req.i18n = getI18n(req);
  I18n.registerMethods(res.locals, req);

  /*  Setup i18n */
  if(req.i18n && req.i18n.prefLocale) {
    req.i18n.setLocale(req.i18n.prefLocale);
  }
  i18n.setLocaleFromQuery(req);

  /* i18n stuff */
  res.locals.locale = req.i18n;
  res.locals.lang = req.i18n && req.i18n.locale || 'en';

  next();
};
