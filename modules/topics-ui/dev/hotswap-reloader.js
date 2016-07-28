'use strict';

var fs = require('fs');
var path = require('path');

function hotswapReloader(baseDir, callback) {
  fs.watch(baseDir, { persistent: true }, function (event, filename) {
    if (event === 'change' && filename) {

      var location = path.resolve(baseDir, filename);

      // Yes, this is an official part of the nodejs api:
      // From the docs:
      // > Modules are cached in this object when they are required.
      // > By deleting a key value from this object, the next require
      // > will reload the module.
      delete require.cache[location];

      callback(filename, location);
    }
  });
}

module.exports = hotswapReloader;
