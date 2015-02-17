/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env             = require('../../utils/env');
var config          = env.config;
var I18n            = require('i18n-2');
var path            = require('path');
var fs              = require('fs');

var localesDir = path.join(__dirname, '..', '..', '..', 'locales');
var homepageLocalesDir = path.join(__dirname, '..', '..', '..', 'locales', 'homepage');
var devMode =config.runtimeEnvironment === 'dev';

function getLocales(localeDir) {
  var files = fs.readdirSync(localeDir);
  /* EN must always appear first */
  return ['en'].concat(files
    .filter(function(file) {
      var fullName = path.join(localeDir, file);
      return fs.statSync(fullName).isFile() && path.extname(file) === '.js';
    })
    .map(function(file) {
      return path.basename(file, '.js');
    })
    .filter(function(lang) {
      return lang !== 'en';
    }));
}

var locales = getLocales(localesDir);
var homepageLocales = getLocales(homepageLocalesDir);
var homepagePath = config.get('web:homeurl');

function getI18nOptions(req) {
  if(req.path === homepagePath) {
    return {
      locales: homepageLocales,
      defaultLocale: 'en',
      devMode: devMode,
      directory: homepageLocalesDir,
      request: req
    };
  }

  return {
    locales: locales,
    defaultLocale: 'en',
    devMode: devMode,
    directory: localesDir,
    request: req,
  };

}
module.exports = function(req, res, next) {
  var opt = getI18nOptions(req);
  var i18n = req.i18n = new I18n(opt);
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
