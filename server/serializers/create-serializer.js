'use strict';

var fs      = require('fs');
var path    = require('path');

module.exports = function(serializerDirectory) {
  var e = {
    serialize: require('./serialize'),
    serializeObject: require('./serialize-object')
  };

  fs.readdirSync(__dirname + '/' + serializerDirectory).forEach(function(fileName) {
    if(!/\.js$/.test(fileName)) return;

    var baseName = path.basename(fileName, '.js');

    var strategyName = baseName.replace(/\-./g, function(match) {
      return match[1].toUpperCase();
    }).replace(/^./, function(match) {
      return match.toUpperCase();
    });

    var Strategy = require('./' + serializerDirectory + '/' + baseName);
    Strategy.prototype.strategyType = serializerDirectory; // Not ideal

    e[strategyName] = require('./' + serializerDirectory + '/' + baseName);
  });

  return e;
};
