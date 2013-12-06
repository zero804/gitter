/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

module.exports = exports = function(err) {
  if(err.statusCode == 401 || err.statusCode == 403) {
    err.gitterAction = 'logout_destroy_user_tokens';
  }

  throw err;
};