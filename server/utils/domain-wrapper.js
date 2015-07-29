"use strict";

var env = require('gitter-web-env');
var domain = require('domain');
var logger = env.logger;
var shutdown = require('shutdown');
var errorReporter = env.errorReporter;

module.exports = function(app) {

  return function(req, res) {
    var reqd = domain.create();
    reqd.add(req);
    reqd.add(res);

    req.on('error', function(err) {
      logger.error('Request failed: ' + err, { message: err.message, name: err.name });

      if(!res.headersSent) {
        res.sendStatus(500);
      } else {
        res.end();
      }

      var userId = req.user && req.user.id;

      errorReporter(err, { type: 'request', userId: userId });

      reqd.dispose();
    });

    reqd.on('error', function(err) {
      try {
        if(!res.headersSent) {
          res.sendStatus(500);
        } else {
          res.end();
        }

        var userId = req.user && req.user.id;


        errorReporter(err, { type: 'domain', userId: userId });

        logger.error('----------------------------------------------------------------');
        logger.error('-- A BadThing has happened.');
        logger.error('----------------------------------------------------------------');
        logger.error('Domain exception: ' + err, {
          message: err.message,
          url: req.url,
          method: req.method,
          name: err.name,
          userId: userId
        });

        if(err.stack) {
          logger.error('' + err.stack);
        }

        logger.error('Domain exception: ' + err + ' forcing shutdown');
      } catch(e) {
        /* This might seem strange, but sometime just logging the error will crash your process a second time */
        try {
          console.log('The error handler crashed too');
        } catch(e) {
        }
      }

      try {
        reqd.dispose();
      } catch(e) {
        console.log('Failed to dispose of domain' + e);
      }

      try {
        shutdown.shutdownGracefully(11);
      } catch(e) {
        console.log('The shutdown handler crashed too');
      }


    });

    var args = arguments;

    reqd.run(function() {
      app.apply(null, args);
    });

  };

};
