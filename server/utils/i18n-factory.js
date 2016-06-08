"use strict";

var env = require('gitter-web-env');
var config = env.config;
var I18n = require('i18n-2');
var path = require('path');
var fs = require('fs');

var localesDir = path.join(__dirname, '../../node_modules/@gitterhq/translations');
var homepageLocalesDir = path.join(localesDir, 'homepage');
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

module.exports = {
  get: function(req) {
    return new I18n({
      locales: locales,
      defaultLocale: 'en',
      devMode: devMode,
      directory: localesDir,
      request: req
    });
  },

  getLocales: function() {
    return locales;
  },

  getHomePage: function(req) {
    return new I18n({
      locales: homepageLocales,
      defaultLocale: 'en',
      devMode: devMode,
      directory: homepageLocalesDir,
      request: req
    });
  }
};
