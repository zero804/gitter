/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var fs          = require('fs');
var handlebars  = require('handlebars');
var i18n        = require('./i18n');
var hbsHelpers  = require('../web/hbs-helpers');

// TODO: add caching!
handlebars.registerHelper('cdn', hbsHelpers.cdn);
handlebars.registerHelper('pad', hbsHelpers.pad);
handlebars.registerHelper('oneLine', hbsHelpers.oneLine);

// register hbs helpers in res.locals' context which provides this.locale
handlebars.registerHelper('__', function () {
  return i18n.__.apply(this, arguments);
});

handlebars.registerHelper('__n', function () {
  return i18n.__n.apply(this, arguments);
});

module.exports = {
  compile : function(sourceFile, callback) {
    var sourceFileName = __dirname + '/../../public/templates/' + sourceFile + '.hbs';

    fs.readFile(sourceFileName, 'utf-8', function (err, source) {
      if (err) return callback(err);
      var template = handlebars.compile(source);
      callback(null, template);
    });

  }
};
