/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";


var statsService = require('../services/stats-service');

// Measure request elapsed time.

module.exports = function responseTime(winston, minimal) {
  return function(req, res, next){
    var start = new Date();

    if (res._responseTime) return next();
    res._responseTime = true;

    res.on('header', function() {
      var duration = new Date() - start;
      statsService.responseTime('web.request', duration);
      if(duration >= 500) {
        winston.warn('Request took ' + duration + 'ms. ', {
          method: req.method,
          url: req.url,
          duration: duration,
          status: res.statusCode
        });
      }

      if(res.statusCode === 404 && req.url.match(/\.map$/))
        return;

      if(!minimal) {
        winston.info('request', {
          method: req.method,
          status: res.statusCode,
          url: req.url,
          headers: req.headers['user-agent'],
          duration: duration + 'ms',
          ip: req.headers['x-forwarded-for'] || req.ip || 'unknown'
        });
      } else {
        winston.verbose([
          'request',
          res.statusCode,
          req.method,
          req.url,
          duration + 'ms'
          ].join(' '));
      }
    });

    next();
  };
};

