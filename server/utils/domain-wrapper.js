/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var domain = require('domain');
var winston = require('./winston');
var shutdown = require('./shutdown');

var errorCount = 0;

module.exports = function(app) {

  return function(req, res) {
    var reqd = domain.create();
    reqd.add(req);
    reqd.add(res);

    reqd.on('error', function(err) {
      errorCount++;
      winston.error('An unhandled domain exception occurred: ' + err, { url: req.url, exception: err });

      if(!res.headersSent) {
        res.send(500);
      }

      try {
        reqd.dispose();
      } catch(e2) {
      }

      if(errorCount > 20) {
        winston.error('Too many errors have occured. Recycling this server');
        shutdown.shutdownGracefully();
      }

    });

    var args = arguments;

    reqd.run(function() {
      app.apply(null, args);
    });

  };

};