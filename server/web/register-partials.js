'use strict';

var Promise = require('bluebird');
var path = require('path');
var fs = require('fs-extra');
var readFile = Promise.promisify(fs.readFile);
var glob = Promise.promisify(require('glob'));


module.exports = function(hbs) {
  var partialsDir = path.join(__dirname, 'public/templates/partials/**');

  /* * /
  // async
  return glob(partialsDir)
    .then(function(files) {
      var registeringPromises = files.map(function(file) {
        return readFile(file)
          .then(function(partialTemplate) {
            var partialName = path.basename(file, '.hbs');
            hbs.registerPartial(partialName, partialTemplate);
          });
      });

      return Promise.all(registeringPromises);
    });
  /* */

  var files = glob.sync(partialsDir);
  console.log(partialsDir, files);
  files.forEach(function(file) {
    var partialName = path.basename(file, '.hbs');
    var partialTemplate = fs.readFileSync(file);
    console.log('Registering partial', partialName);
    hbs.registerPartial(partialName, partialTemplate);
  });
};
