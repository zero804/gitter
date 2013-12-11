/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

// Measure request elapsed time.

module.exports = function responseTime(winston, minimal) {
  return function(req, res, next){
    var start = new Date();

    if (res._responseTime) return next();
    res._responseTime = true;

    res.on('header', function() {
      var duration = new Date() - start;

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

