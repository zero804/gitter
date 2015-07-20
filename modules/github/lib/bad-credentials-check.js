/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

module.exports = exports = function(err) {
  if(err.statusCode == 401 || err.statusCode == 403) {
    var logout = true;

    if(err.headers) {
      var rateLimitRemaining = err.headers['x-ratelimit-remaining'];
      if(rateLimitRemaining) rateLimitRemaining = parseInt(rateLimitRemaining, 10);

      /* Run out of rate-limit? Don't log the user out */
      if(rateLimitRemaining === 0) {
        logout = false;
      }
    }

    if(logout) {
      err.gitterAction = 'logout_destroy_user_tokens';
    } else {
      // TODO: Notify the user somehow
    }
  }

  throw err;
};