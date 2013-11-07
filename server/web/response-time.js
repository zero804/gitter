/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

// Measure request elapsed time.

module.exports = function responseTime(winston) {
  return function(req, res, next){
    var start = new Date();

    if (res._responseTime) return next();
    res._responseTime = true;

    res.on('header', function(){
      var duration = new Date() - start;

      winston.info('request', {
        method: req.method,
        url: req.url,
        headers: req.headers['user-agent'],
        duration: duration + 'ms',
        ip: req.headers['x-forwarded-for'] || 'unknown'
      });
    });

    next();
  };
};

