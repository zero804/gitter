'use strict';

var path = require('path');
var fs = require('fs');

function createStatic() {
  var staticDir = path.join(__dirname, '../../../output/assets/js');
  var staticFile = path.join(staticDir, 'sw.js');

  return function(req, res, next) {
    if (!fs.existsSync(staticFile)) {
      throw new Error(
        'You probably need to wait for the Gitter webpack build to finish. Cannot resolve service worker: ' +
          staticFile
      );
    }

    var options = {
      dotfiles: 'deny',
      headers: {
        // Headers go here
      }
    };

    res.sendFile(staticFile, options, function(err) {
      if (err) return next(err);
    });
  };
}

function install(app) {
  app.get('/sw.js', createStatic());
}

module.exports = {
  install: install
};
