/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env = require('../utils/env');
var stats = env.stats;

// Measure request elapsed time.

module.exports = function responseTime(logger, minimal) {
  return function(req, res, next){
    var start = new Date();

    if (res._responseTime) return next();
    res._responseTime = true;

    res.on('header', function() {
      var duration = new Date() - start;
      stats.responseTime('web.request', duration);
      if(duration >= 500) {
        logger.warn('Request took ' + duration + 'ms. ', {
          method: req.method,
          url: req.url,
          duration: duration,
          status: res.statusCode
        });
      }

      if(res.statusCode === 404 && req.url.match(/\.map$/))
        return;

      if(!minimal) {
        logger.info('request', {
          method: req.method,
          status: res.statusCode,
          url: req.url,
          user: req.user && req.user.username,
          duration: duration + 'ms',
          ip: req.headers['x-forwarded-for'] || req.ip || 'unknown'
        });
      } else {
        logger.verbose([
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

