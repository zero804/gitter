'use strict';
var nconf = require('../utils/config');
var path = require('path');
var fs = require('fs');
var handlebars = require('handlebars');
var baseDir = path.normalize(__dirname + '/../../' + nconf.get('web:staticContent'));

/**
 * compiles templates for other modules given a path
 */
module.exports = function (path) {
  if (!path) throw new Error('You must provide a path to the template.');
  var buffer = fs.readFileSync(baseDir + path.split('.hbs')[0] + '.hbs');
  return handlebars.compile(buffer.toString());
};
