/*jshint globalstrict:true, trailing:false unused:true node:true*/
/*global console:false, require: true, module: true, process: false */
"use strict";

var fs = require("fs");
var path = require("path");
var handlebars = require('handlebars');

// TODO: add caching!

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
