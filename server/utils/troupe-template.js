/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var fs          = require('fs');
var handlebars  = require('handlebars');
var i18nFactory = require('./i18n-factory');
var _           = require('underscore');
var hbsHelpers  = require('../web/hbs-helpers');
var Q           = require('q');

// TODO: add caching!
handlebars.registerHelper('cdn', hbsHelpers.cdn);
handlebars.registerHelper('pad', hbsHelpers.pad);
handlebars.registerHelper('oneLine', hbsHelpers.oneLine);

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
  compile : function(sourceFile, callback) {
    var d = Q.defer();
    var sourceFileName = __dirname + '/../../public/templates/' + sourceFile + '.hbs';

    fs.readFile(sourceFileName, 'utf-8', function (err, source) {
      if (err) return d.reject(err);
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
      d.resolve(templateWith18n);
    });

    return d.promise.nodeify(callback);
  }
};
