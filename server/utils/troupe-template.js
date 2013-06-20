/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var fs = require("fs");
var handlebars = require('handlebars');

// TODO: add caching!
handlebars.registerHelper('cdn', require('../web/hbs-helpers').cdn);


module.exports = {
  compile : function(sourceFile, callback) {
    var sourceFileName = 'public/templates/' + sourceFile + '.hbs';

    fs.readFile(sourceFileName, 'utf-8', function (err, source) {
      if (err) return callback(err);
      var template = handlebars.compile(source);
      callback(null, template);
    });

  }
};
