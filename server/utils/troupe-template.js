"use strict";

var fs = require('fs');
var handlebars = require('handlebars');
var i18nFactory = require('gitter-web-i18n');
var _ = require('underscore');
var hbsHelpers = require('../web/hbs-helpers');
var avatarImgSrcSetHbsHelper = require('gitter-web-avatars/shared/avatar-img-srcset-hbs-helper');
var Promise = require('bluebird');

// TODO: add caching!
handlebars.registerHelper('cdn', hbsHelpers.cdn);
handlebars.registerHelper('pad', hbsHelpers.pad);
handlebars.registerHelper('avatarSrcSet', avatarImgSrcSetHbsHelper);

var defaultI18n = i18nFactory.get();

handlebars.registerHelper('__', function() {
  var options = arguments[arguments.length - 1];
  var args = Array.prototype.slice.call(arguments, 0, -1);
  var i18n = options.data.root.i18n || defaultI18n;
  return i18n.__.apply(i18n, args);
});

handlebars.registerHelper('__n', function() {
  var options = arguments[arguments.length - 1];
  var args = Array.prototype.slice.call(arguments, 0, -1);
  var i18n = options.data.root.i18n || defaultI18n;
  return i18n.__n.apply(i18n, args);
});

module.exports = {
  compile: function(sourceFile, callback) {
    var sourceFileName = __dirname + '/../../public/templates/' + sourceFile + '.hbs';

    return Promise.fromCallback(function(callback) {
      fs.readFile(sourceFileName, 'utf-8', callback);
    })
    .then(function(source) {
      var template = handlebars.compile(source);
      var templateWith18n = function(options) {

        var i18n;
        if (options.i18n) {
          i18n = options.i18n;
        } else {
          i18n = i18nFactory.get();
          if (options.lang) i18n.setLocale(options.lang);
        }

        return template(_.extend({}, options, { i18n: i18n }));
      };

      return templateWith18n;
    })
    .nodeify(callback);
  }
};
